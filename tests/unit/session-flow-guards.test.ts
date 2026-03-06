import { describe, expect, it } from "vitest";
import { shouldScheduleSilenceNudge } from "../../src/context/session-flow-guards";

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
});
