import { describe, expect, it } from "vitest";
import { shouldStartMicCapture } from "@/context/mic-activation-policy";

describe("shouldStartMicCapture", () => {
  it("keeps microphone startup deferred during the locked opening turn", () => {
    expect(
      shouldStartMicCapture({
        status: "playing",
        openingTurnLocked: true,
        micCaptureStarted: false,
        micStartInFlight: false,
        textTurnMode: false,
      }),
    ).toBe(false);
  });

  it("allows microphone prewarm during the locked opening turn when explicitly requested", () => {
    expect(
      shouldStartMicCapture({
        status: "playing",
        openingTurnLocked: true,
        micCaptureStarted: false,
        micStartInFlight: false,
        textTurnMode: false,
        allowDuringOpeningTurn: true,
      }),
    ).toBe(true);
  });

  it("starts microphone capture once the opening turn is complete", () => {
    expect(
      shouldStartMicCapture({
        status: "playing",
        openingTurnLocked: false,
        micCaptureStarted: false,
        micStartInFlight: false,
        textTurnMode: false,
      }),
    ).toBe(true);
  });

  it("does not start duplicate microphone capture attempts", () => {
    expect(
      shouldStartMicCapture({
        status: "playing",
        openingTurnLocked: false,
        micCaptureStarted: true,
        micStartInFlight: false,
        textTurnMode: false,
      }),
    ).toBe(false);
    expect(
      shouldStartMicCapture({
        status: "playing",
        openingTurnLocked: false,
        micCaptureStarted: false,
        micStartInFlight: true,
        textTurnMode: false,
      }),
    ).toBe(false);
  });

  it("keeps microphone capture disabled after the session switches to text-turn debug mode", () => {
    expect(
      shouldStartMicCapture({
        status: "playing",
        openingTurnLocked: false,
        micCaptureStarted: false,
        micStartInFlight: false,
        textTurnMode: true,
      }),
    ).toBe(false);
  });
});
