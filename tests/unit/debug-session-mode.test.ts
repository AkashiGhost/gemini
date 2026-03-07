import { describe, expect, it } from "vitest";
import {
  isDebugTextSessionEnabled,
  shouldUseMicrophoneInSession,
  shouldUseSilenceNudgesInSession,
} from "../../src/context/debug-session-mode";

describe("debug session mode", () => {
  it("detects debug text mode from the query string", () => {
    expect(isDebugTextSessionEnabled("?story=the-call&debugText=1")).toBe(true);
    expect(isDebugTextSessionEnabled("?story=the-call")).toBe(false);
  });

  it("disables microphone and silence nudges in debug text mode", () => {
    expect(shouldUseMicrophoneInSession(true)).toBe(false);
    expect(shouldUseSilenceNudgesInSession(true)).toBe(false);
    expect(shouldUseMicrophoneInSession(false)).toBe(true);
    expect(shouldUseSilenceNudgesInSession(false)).toBe(true);
  });
});
