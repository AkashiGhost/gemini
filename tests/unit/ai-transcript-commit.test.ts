import { describe, expect, it } from "vitest";
import { shouldCommitAiTranscript } from "../../src/context/ai-transcript-commit";

describe("shouldCommitAiTranscript", () => {
  it("commits a non-empty ai turn once", () => {
    expect(shouldCommitAiTranscript("The corridor is darker now.", "")).toBe(true);
    expect(shouldCommitAiTranscript("The corridor is darker now.", "The corridor is darker now.")).toBe(false);
  });

  it("ignores empty ai text", () => {
    expect(shouldCommitAiTranscript("", "")).toBe(false);
    expect(shouldCommitAiTranscript("   ", "")).toBe(false);
  });
});
