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
      }),
    ).toBe(false);
  });

  it("starts microphone capture once the opening turn is complete", () => {
    expect(
      shouldStartMicCapture({
        status: "playing",
        openingTurnLocked: false,
        micCaptureStarted: false,
        micStartInFlight: false,
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
      }),
    ).toBe(false);
    expect(
      shouldStartMicCapture({
        status: "playing",
        openingTurnLocked: false,
        micCaptureStarted: false,
        micStartInFlight: true,
      }),
    ).toBe(false);
  });
});
