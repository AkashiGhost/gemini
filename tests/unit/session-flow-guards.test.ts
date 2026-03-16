import { describe, expect, it } from "vitest";
import {
  shouldArmOpeningTurnMic,
  shouldScheduleSilenceNudge,
} from "../../src/context/session-flow-guards";

describe("session flow guards", () => {
  it("does not schedule silence nudges before the opening turn finishes", () => {
    expect(
      shouldScheduleSilenceNudge({
        status: "playing",
        isSpeaking: false,
        isPaused: false,
        hasAiSpoken: false,
        openingTurnLocked: true,
      }),
    ).toBe(false);
  });

  it("arms the microphone once the opening audio has arrived and text mode is off", () => {
    expect(
      shouldArmOpeningTurnMic({
        openingTurnLocked: true,
        responseReceived: true,
        hasAudio: true,
        textTurnMode: false,
      }),
    ).toBe(true);
  });

  it("does not arm the microphone before the opening response audio arrives", () => {
    expect(
      shouldArmOpeningTurnMic({
        openingTurnLocked: true,
        responseReceived: true,
        hasAudio: false,
        textTurnMode: false,
      }),
    ).toBe(false);
  });
});
