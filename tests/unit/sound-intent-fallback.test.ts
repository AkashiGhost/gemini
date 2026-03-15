import { describe, expect, it } from "vitest";
import {
  detectNarrativeCueSoundIds,
  detectTranscriptIntentCueSoundIds,
  getTranscriptIntentCueRules,
  selectCuesOffCooldown,
} from "../../src/lib/sound-intent-fallback";

describe("detectTranscriptIntentCueSoundIds", () => {
  it("maps running intent to footsteps deterministically", () => {
    const rules = getTranscriptIntentCueRules("the-call");

    const cues = detectTranscriptIntentCueSoundIds(
      "I am running right now, keep moving down the hall.",
      rules,
    );

    expect(cues).toEqual(["footsteps"]);
  });

  it("returns ordered unique cues when multiple intents are present", () => {
    const rules = getTranscriptIntentCueRules("the-call");

    const cues = detectTranscriptIntentCueSoundIds(
      "Run to the keypad and enter code, then slam the door.",
      rules,
    );

    expect(cues).toEqual(["footsteps", "door_slam", "keypad_beep"]);
  });
});

describe("detectNarrativeCueSoundIds", () => {
  it("merges inline markers with keyword-derived fallback cues", () => {
    const rules = getTranscriptIntentCueRules("the-call");

    const cues = detectNarrativeCueSoundIds(
      "[SOUND:door_creak] Water starts dripping behind you while you reach the keypad.",
      rules,
    );

    expect(cues).toEqual(["door_creak", "keypad_beep", "water_drip"]);
  });
});

describe("selectCuesOffCooldown", () => {
  it("applies cooldown per cue id and allows replay after cooldown expires", () => {
    const cooldowns = new Map<string, number>();

    const first = selectCuesOffCooldown(["footsteps", "footsteps", "door_slam"], cooldowns, {
      nowMs: 1_000,
      cooldownMs: 30_000,
    });
    expect(first).toEqual({
      readyCueIds: ["footsteps", "door_slam"],
      coolingDownCueIds: [],
    });

    const withinCooldown = selectCuesOffCooldown(["footsteps"], cooldowns, {
      nowMs: 20_000,
      cooldownMs: 30_000,
    });
    expect(withinCooldown).toEqual({
      readyCueIds: [],
      coolingDownCueIds: ["footsteps"],
    });

    const afterCooldown = selectCuesOffCooldown(["footsteps"], cooldowns, {
      nowMs: 35_000,
      cooldownMs: 30_000,
    });
    expect(afterCooldown).toEqual({
      readyCueIds: ["footsteps"],
      coolingDownCueIds: [],
    });
  });
});
