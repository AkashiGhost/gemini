import { describe, expect, it } from "vitest";

import {
  canGoBackInOnboarding,
  canSkipOnboarding,
  getPreviousOnboardingState,
  type OnboardingStep,
} from "../../src/components/game/OnboardingFlow";

describe("onboarding navigation helpers", () => {
  it("allows going back through scenes and headphones before session handoff", () => {
    expect(canGoBackInOnboarding("scene", 1)).toBe(true);
    expect(canGoBackInOnboarding("headphones", 2)).toBe(true);
  });

  it("blocks back navigation once countdown or ringing has started", () => {
    expect(canGoBackInOnboarding("countdown", 2)).toBe(false);
    expect(canGoBackInOnboarding("ringing", 2)).toBe(false);
    expect(canGoBackInOnboarding("scene", 0)).toBe(false);
  });

  it("returns the previous onboarding state when it exists", () => {
    expect(getPreviousOnboardingState("scene", 2, 3)).toEqual<{
      step: OnboardingStep;
      sceneIndex: number;
    }>({
      step: "scene",
      sceneIndex: 1,
    });

    expect(getPreviousOnboardingState("headphones", 2, 3)).toEqual({
      step: "scene",
      sceneIndex: 2,
    });
  });

  it("returns null when no safe previous onboarding state exists", () => {
    expect(getPreviousOnboardingState("scene", 0, 3)).toBeNull();
    expect(getPreviousOnboardingState("countdown", 2, 3)).toBeNull();
    expect(getPreviousOnboardingState("ringing", 2, 3)).toBeNull();
  });

  it("only exposes skip intro before the session handoff begins", () => {
    expect(canSkipOnboarding("scene")).toBe(true);
    expect(canSkipOnboarding("headphones")).toBe(true);
    expect(canSkipOnboarding("countdown")).toBe(false);
    expect(canSkipOnboarding("ringing")).toBe(false);
  });
});
