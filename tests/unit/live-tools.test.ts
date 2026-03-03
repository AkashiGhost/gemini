import type { FunctionCall } from "@google/genai";
import { describe, expect, it } from "vitest";
import {
  parseLiveToolCall,
  tensionToPhase,
  type TensionPhaseThreshold,
} from "../../src/lib/config/live-tools";

describe("tensionToPhase", () => {
  it("maps tension boundaries and clamps out-of-range values", () => {
    expect(tensionToPhase(-1)).toBe(0);
    expect(tensionToPhase(0)).toBe(0);
    expect(tensionToPhase(0.2)).toBe(1);
    expect(tensionToPhase(0.399)).toBe(1);
    expect(tensionToPhase(0.4)).toBe(2);
    expect(tensionToPhase(0.84)).toBe(3);
    expect(tensionToPhase(0.85)).toBe(4);
    expect(tensionToPhase(2)).toBe(4);
  });

  it("supports custom thresholds and safe fallback for empty threshold lists", () => {
    const custom: TensionPhaseThreshold[] = [
      { minTension: 0, phase: 10 },
      { minTension: 0.5, phase: 20 },
      { minTension: 0.75, phase: 30 },
    ];

    expect(tensionToPhase(0.74, custom)).toBe(20);
    expect(tensionToPhase(0.76, custom)).toBe(30);
    expect(tensionToPhase(0.9, [])).toBe(0);
  });
});

describe("parseLiveToolCall", () => {
  it("returns null for unknown tool names", () => {
    const call = {
      name: "unknown_tool",
      args: { anything: true },
    } as unknown as FunctionCall;

    expect(parseLiveToolCall(call, { nowMs: 1234 })).toBeNull();
  });

  it("parses trigger_sound arguments and preserves metadata", () => {
    const call = {
      id: "call-1",
      name: "trigger_sound",
      args: {
        sound_id: " thunder_roll ",
        volume: 0.65,
        loop: true,
        fade_in_seconds: 2.5,
      },
    } as unknown as FunctionCall;

    const parsed = parseLiveToolCall(call, {
      sessionId: "session-1",
      causalChain: ["root"],
      nowMs: 1000,
    });

    expect(parsed).toEqual({
      name: "trigger_sound",
      callId: "call-1",
      sessionId: "session-1",
      receivedAtMs: 1000,
      causalChain: ["root", "tool:trigger_sound", "call:call-1"],
      rawArgs: {
        sound_id: " thunder_roll ",
        volume: 0.65,
        loop: true,
        fade_in_seconds: 2.5,
      },
      args: {
        soundId: "thunder_roll",
        volume: 0.65,
        loop: true,
        fadeInSeconds: 2.5,
      },
    });
  });

  it("parses set_tension from alternate keys and normalizes percent values", () => {
    const call = {
      name: "set_tension",
      args: {
        value: 75,
        phase: 2.9,
        transition: 6,
      },
    } as unknown as FunctionCall;

    const parsed = parseLiveToolCall(call, {
      causalChain: ["session:start"],
      nowMs: 42,
    });

    expect(parsed).toEqual({
      name: "set_tension",
      callId: "set_tension-42",
      sessionId: undefined,
      receivedAtMs: 42,
      causalChain: ["session:start", "tool:set_tension", "call:set_tension-42"],
      rawArgs: {
        value: 75,
        phase: 2.9,
        transition: 6,
      },
      args: {
        tension: 0.75,
        phase: 2,
        transitionSeconds: 6,
      },
    });
  });

  it("returns null for invalid required args", () => {
    const missingSound = {
      name: "trigger_sound",
      args: {},
    } as unknown as FunctionCall;
    const invalidTension = {
      name: "set_tension",
      args: { tension: "high" },
    } as unknown as FunctionCall;

    expect(parseLiveToolCall(missingSound, { nowMs: 1 })).toBeNull();
    expect(parseLiveToolCall(invalidTension, { nowMs: 1 })).toBeNull();
  });

  it("parses end_game and handles absent args objects safely", () => {
    const call = {
      name: "end_game",
      args: null,
    } as unknown as FunctionCall;

    const parsed = parseLiveToolCall(call, { sessionId: "s", nowMs: 99 });

    expect(parsed).toEqual({
      name: "end_game",
      callId: "end_game-99",
      sessionId: "s",
      receivedAtMs: 99,
      causalChain: ["tool:end_game", "call:end_game-99"],
      rawArgs: {},
      args: {
        reason: undefined,
        fadeOutSeconds: undefined,
      },
    });
  });
});
