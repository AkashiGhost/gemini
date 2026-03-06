import { describe, expect, it } from "vitest";
import {
  beginOpeningTurn,
  handleOpeningTurnInterrupted,
  markOpeningTurnCompleted,
  markOpeningTurnResponseReceived,
  shouldFailOpeningTurn,
  shouldSendOpeningFallback,
} from "@/context/opening-turn-state";

describe("opening turn state", () => {
  it("requests a fallback while the opening turn is still waiting for any response", () => {
    const state = beginOpeningTurn();

    expect(shouldSendOpeningFallback(state)).toBe(true);
    expect(shouldFailOpeningTurn(state)).toBe(true);
  });

  it("suppresses fallback once the opening turn has started responding", () => {
    const state = markOpeningTurnResponseReceived(beginOpeningTurn());

    expect(shouldSendOpeningFallback(state)).toBe(false);
    expect(shouldFailOpeningTurn(state)).toBe(false);
  });

  it("unlocks the opening turn when completion arrives before any response", () => {
    const state = markOpeningTurnCompleted(beginOpeningTurn());

    expect(state).toEqual({
      locked: false,
      responseReceived: false,
      completed: true,
    });
    expect(shouldSendOpeningFallback(state)).toBe(false);
    expect(shouldFailOpeningTurn(state)).toBe(false);
  });

  it("re-arms the opening turn after an interruption before completion", () => {
    const interrupted = handleOpeningTurnInterrupted(
      markOpeningTurnResponseReceived(beginOpeningTurn()),
    );

    expect(interrupted.shouldRetryOpening).toBe(true);
    expect(shouldSendOpeningFallback(interrupted.next)).toBe(true);
    expect(shouldFailOpeningTurn(interrupted.next)).toBe(true);
  });

  it("does not retry once the opening turn has completed", () => {
    const completed = markOpeningTurnCompleted(
      markOpeningTurnResponseReceived(beginOpeningTurn()),
    );
    const interrupted = handleOpeningTurnInterrupted(completed);

    expect(interrupted.shouldRetryOpening).toBe(false);
    expect(interrupted.next.completed).toBe(true);
    expect(interrupted.next.locked).toBe(false);
    expect(shouldSendOpeningFallback(interrupted.next)).toBe(false);
    expect(shouldFailOpeningTurn(interrupted.next)).toBe(false);
  });
});
