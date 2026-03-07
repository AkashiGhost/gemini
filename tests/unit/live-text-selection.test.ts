import { describe, expect, it } from "vitest";
import {
  appendLiveDisplayText,
  selectLiveDisplayText,
} from "../../src/lib/live-text-selection";

describe("selectLiveDisplayText", () => {
  it("prefers sanitized model text over output transcription when both exist", () => {
    expect(selectLiveDisplayText({
      modelText: "Hello? Who is this? Your number was the only one that connected.",
      outputTranscriptionText: "Hello? Whois this?Your numberwas theonlyonethat connected.",
    })).toBe("Hello? Who is this? Your number was the only one that connected.");
  });

  it("falls back to sanitized output transcription when model text is absent", () => {
    expect(selectLiveDisplayText({
      modelText: "",
      outputTranscriptionText: "1.0, set_tension:0.6} I just woke up in a concrete room.",
    })).toBe("I just woke up in a concrete room.");
  });

  it("inserts a space when adjacent streamed chunks would otherwise collapse words", () => {
    expect(appendLiveDisplayText(
      "Please, you have to help me,",
      "your number was the only one that connected.",
    )).toBe("Please, you have to help me, your number was the only one that connected.");
  });

  it("does not add an extra space before punctuation-leading chunks", () => {
    expect(appendLiveDisplayText(
      "I can hear it",
      "... getting louder.",
    )).toBe("I can hear it... getting louder.");
  });
});
