import { describe, expect, it } from "vitest";
import { canSendDebugTurn } from "../../src/context/debug-turn-policy";

describe("canSendDebugTurn", () => {
  it("allows debug turns only when the live session is ready for player input", () => {
    expect(canSendDebugTurn({
      status: "playing",
      isPaused: false,
      turnInputReady: true,
      hasSession: true,
      text: "I hear you.",
    })).toBe(true);
  });

  it("blocks debug turns while playback is still draining", () => {
    expect(canSendDebugTurn({
      status: "playing",
      isPaused: false,
      turnInputReady: false,
      hasSession: true,
      text: "I hear you.",
    })).toBe(false);
  });

  it("blocks debug turns for blank messages and paused sessions", () => {
    expect(canSendDebugTurn({
      status: "playing",
      isPaused: true,
      turnInputReady: true,
      hasSession: true,
      text: "I hear you.",
    })).toBe(false);

    expect(canSendDebugTurn({
      status: "playing",
      isPaused: false,
      turnInputReady: true,
      hasSession: true,
      text: "   ",
    })).toBe(false);
  });
});
