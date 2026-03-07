import { describe, expect, it } from "vitest";
import { shouldAutoRetryLiveSession } from "../../src/context/live-retry-policy";

describe("shouldAutoRetryLiveSession", () => {
  it("retries one startup failure for transient tokenizer inference errors", () => {
    expect(shouldAutoRetryLiveSession({
      errorMessage: 'Failed to run inference for model: go/debugstr name: "prod-common-global__/aistudio/gemini-v3-streaming-audio-tokenizer_"',
      retryAttempts: 0,
      maxRetryAttempts: 1,
      hasAiSpoken: false,
      transcriptCount: 0,
    })).toBe(true);
  });

  it("does not retry after the retry budget is exhausted", () => {
    expect(shouldAutoRetryLiveSession({
      errorMessage: "Failed to run inference for model: gemini-v3-streaming-audio-tokenizer",
      retryAttempts: 1,
      maxRetryAttempts: 1,
      hasAiSpoken: false,
      transcriptCount: 0,
    })).toBe(false);
  });

  it("does not retry once any transcript content exists", () => {
    expect(shouldAutoRetryLiveSession({
      errorMessage: "Failed to run inference for model: gemini-v3-streaming-audio-tokenizer",
      retryAttempts: 0,
      maxRetryAttempts: 1,
      hasAiSpoken: false,
      transcriptCount: 1,
    })).toBe(false);
  });

  it("does not retry non-transient errors", () => {
    expect(shouldAutoRetryLiveSession({
      errorMessage: "Failed to get ephemeral token (500): Missing GEMINI_API_KEY",
      retryAttempts: 0,
      maxRetryAttempts: 1,
      hasAiSpoken: false,
      transcriptCount: 0,
    })).toBe(false);
  });

  it("retries one startup failure for transient unsupported-operation closes", () => {
    expect(shouldAutoRetryLiveSession({
      errorMessage: "Operation is not implemented, or supported, or enabled.",
      retryAttempts: 0,
      maxRetryAttempts: 1,
      hasAiSpoken: false,
      transcriptCount: 0,
    })).toBe(true);
  });
});
