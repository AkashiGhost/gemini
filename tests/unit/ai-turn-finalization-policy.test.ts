import { describe, expect, it } from "vitest";
import { shouldFinalizeTurnOnGenerationComplete } from "@/context/ai-turn-finalization-policy";

describe("shouldFinalizeTurnOnGenerationComplete", () => {
  it("allows opening turns to finalize on generationComplete even in text mode", () => {
    expect(
      shouldFinalizeTurnOnGenerationComplete({
        openingTurnLocked: true,
        textTurnMode: true,
      }),
    ).toBe(true);
  });

  it("blocks post-opening text turns from finalizing on generationComplete", () => {
    expect(
      shouldFinalizeTurnOnGenerationComplete({
        openingTurnLocked: false,
        textTurnMode: true,
      }),
    ).toBe(false);
  });

  it("allows non-text turns to finalize on generationComplete", () => {
    expect(
      shouldFinalizeTurnOnGenerationComplete({
        openingTurnLocked: false,
        textTurnMode: false,
      }),
    ).toBe(true);
  });
});
