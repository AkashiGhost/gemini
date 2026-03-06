export interface PlayErrorPresentation {
  title: string;
  detail: string;
  hint: string;
}

export function classifyPlaySessionError(errorMessage?: string): PlayErrorPresentation {
  const msg = errorMessage?.toLowerCase() ?? "";
  const detail = errorMessage ?? "The session could not start.";

  const has429 = /\b429\b/.test(msg) || msg.includes("resource_exhausted");
  const has401 = /\b401\b/.test(msg) || msg.includes("unauthorized") || msg.includes("api key");
  const has403 = /\b403\b/.test(msg) || msg.includes("permission denied");
  const has404 =
    /\b404\b/.test(msg) ||
    msg.includes("not found") ||
    msg.includes("model/resource not found") ||
    msg.includes("configured live model is unavailable");
  const hasTokenizerInferenceFailure =
    msg.includes("failed to run inference for model") ||
    msg.includes("streaming-audio-tokenizer");

  if (msg.includes("did not produce the opening turn") || msg.includes("no response was received from gemini")) {
    return {
      title: "Session delayed",
      detail,
      hint: "The Live session connected but Gemini did not answer in time. Retry before treating this as a model access issue.",
    };
  }

  if (hasTokenizerInferenceFailure) {
    return {
      title: "Live service interrupted",
      detail,
      hint: "Retry the session. This looks like an upstream Gemini Live audio-stack failure, not a quota issue.",
    };
  }

  if (has429) {
    return {
      title: "Rate limit or quota",
      detail,
      hint:
        "This often means per-model or per-session Gemini Live throttling, not necessarily overall account spend quota.",
    };
  }

  if (has403) {
    return {
      title: "Permission denied",
      detail,
      hint: "API key restrictions or project permissions may block Gemini Live token minting.",
    };
  }

  if (has404) {
    return {
      title: "Model/resource unavailable",
      detail,
      hint: "Configured Live model may be unavailable for this key/project. Check model name and access.",
    };
  }

  if (msg.includes("500") || msg.includes("server")) {
    return {
      title: "Server error (500)",
      detail,
      hint: "Check that the Gemini Live session is configured with the correct API key and model.",
    };
  }

  if (has401) {
    return {
      title: "Authentication failed",
      detail,
      hint: "The Gemini API key may be invalid or expired. Update GEMINI_API_KEY in your environment.",
    };
  }

  if (msg.includes("microphone")) {
    return {
      title: "Microphone blocked",
      detail,
      hint: "Allow microphone access in your browser settings, then refresh.",
    };
  }

  if (msg.includes("missing gemini")) {
    return {
      title: "Missing configuration",
      detail,
      hint: "Set GEMINI_API_KEY in your environment variables.",
    };
  }

  return {
    title: "Connection error",
    detail,
    hint: "",
  };
}
