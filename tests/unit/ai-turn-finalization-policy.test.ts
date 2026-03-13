import { describe, expect, it } from "vitest";
import {
  getGenerationCompleteFinalizeFallbackDelayMs,
  shouldFinalizeTurnOnGenerationComplete,
} from "@/context/ai-turn-finalization-policy";

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


describe("getGenerationCompleteFinalizeFallbackDelayMs", () => {
  it("adds a fallback timer for post-opening text turns", () => {
    expect(
      getGenerationCompleteFinalizeFallbackDelayMs({
        openingTurnLocked: false,
        textTurnMode: true,
      }),
    ).toBe(2000);
  });

  it("does not add a fallback timer for opening turns", () => {
    expect(
      getGenerationCompleteFinalizeFallbackDelayMs({
        openingTurnLocked: true,
        textTurnMode: true,
      }),
    ).toBeNull();
  });

  it("does not add a fallback timer for non-text turns", () => {
    expect(
      getGenerationCompleteFinalizeFallbackDelayMs({
        openingTurnLocked: false,
        textTurnMode: false,
      }),
    ).toBeNull();
  });
});
