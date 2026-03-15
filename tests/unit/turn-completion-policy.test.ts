import { describe, expect, it } from "vitest";
import { getOpeningTurnUnlockDecision } from "../../src/context/turn-completion-policy";

describe("getOpeningTurnUnlockDecision", () => {
  it("keeps the opening turn locked while playback is still draining", () => {
    expect(getOpeningTurnUnlockDecision(640)).toEqual({
      unlockNow: false,
      unlockAfterMs: 920,
    });
  });

  it("unlocks immediately when no playback remains", () => {
    expect(getOpeningTurnUnlockDecision(0)).toEqual({
      unlockNow: true,
      unlockAfterMs: 0,
    });
  });
});
