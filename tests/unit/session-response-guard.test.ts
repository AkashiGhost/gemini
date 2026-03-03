import { describe, expect, it } from "vitest";
import {
  buildNoModelResponseErrorMessage,
  didReceiveModelResponse,
} from "../../src/context/session-response-guard";

describe("didReceiveModelResponse", () => {
  it("treats audio-only replies as a valid first model response", () => {
    expect(didReceiveModelResponse({ hasAudio: true, outputTranscriptionText: "" })).toBe(true);
  });

  it("treats non-empty transcription as a valid model response", () => {
    expect(didReceiveModelResponse({ hasAudio: false, outputTranscriptionText: "hello there" })).toBe(true);
  });

  it("does not treat empty signals as a model response", () => {
    expect(didReceiveModelResponse({ hasAudio: false, outputTranscriptionText: "   " })).toBe(false);
  });
});

describe("buildNoModelResponseErrorMessage", () => {
  it("includes the timeout seconds in user-facing copy", () => {
    expect(buildNoModelResponseErrorMessage(22000)).toContain("22s");
  });
});
