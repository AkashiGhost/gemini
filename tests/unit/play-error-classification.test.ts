import { describe, expect, it } from "vitest";
import { classifyPlaySessionError } from "../../src/lib/play-error-classification";

describe("classifyPlaySessionError", () => {
  it("treats first-response timeout as a delayed session, not missing model access", () => {
    const result = classifyPlaySessionError(
      "The session started but Gemini did not produce the opening turn within 22s. Please retry.",
    );

    expect(result.title).toBe("Session delayed");
    expect(result.hint).toContain("did not answer in time");
  });

  it("classifies explicit 404 errors as model/resource unavailable", () => {
    const result = classifyPlaySessionError("Model/resource not found (404): configured live model is unavailable.");

    expect(result.title).toBe("Model/resource unavailable");
  });

  it("classifies explicit 429 errors as rate limit or quota", () => {
    const result = classifyPlaySessionError("Gemini Live token request hit rate-limit/quota (429).");

    expect(result.title).toBe("Rate limit or quota");
  });

  it("classifies tokenizer inference failures as transient live service interruptions", () => {
    const result = classifyPlaySessionError(
      'Failed to run inference for model: go/debugstr name: "prod-common-global__/aistudio/gemini-v3-streaming-audio-tokenizer_"',
    );

    expect(result.title).toBe("Live service interrupted");
    expect(result.hint).toContain("Retry");
  });
});
