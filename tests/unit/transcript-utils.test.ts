import { describe, expect, it } from "vitest";
import {
  getLatestTranscriptEntryBySource,
  getTranscriptSequenceForSource,
} from "@/lib/transcript-utils";

describe("transcript-utils", () => {
  const transcript = [
    { source: "ai", text: "Opening line." },
    { source: "user", text: "I hear you." },
    { source: "ai", text: "The water is rising." },
    { source: "user", text: "Go left." },
  ] as const;

  it("returns the latest entry for a given source", () => {
    expect(getLatestTranscriptEntryBySource(transcript, "ai")).toEqual({
      source: "ai",
      text: "The water is rising.",
    });
    expect(getLatestTranscriptEntryBySource(transcript, "user")).toEqual({
      source: "user",
      text: "Go left.",
    });
  });

  it("returns undefined when no transcript entry matches the source", () => {
    const userOnly: Array<{ source: "user" | "ai"; text: string }> = [
      { source: "user", text: "Hello" },
    ];
    expect(
      getLatestTranscriptEntryBySource(userOnly, "ai"),
    ).toBeUndefined();
  });

  it("counts transcript entries per source to produce a stable sequence number", () => {
    expect(getTranscriptSequenceForSource(transcript, "ai")).toBe(2);
    expect(getTranscriptSequenceForSource(transcript, "user")).toBe(2);
    const empty: Array<{ source: "user" | "ai"; text: string }> = [];
    expect(getTranscriptSequenceForSource(empty, "ai")).toBe(0);
  });
});
