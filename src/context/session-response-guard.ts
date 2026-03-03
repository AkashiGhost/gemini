export interface ModelResponseSignal {
  hasAudio: boolean;
  outputTranscriptionText?: string;
}

export function didReceiveModelResponse(signal: ModelResponseSignal): boolean {
  if (signal.hasAudio) return true;
  if (typeof signal.outputTranscriptionText !== "string") return false;
  return signal.outputTranscriptionText.trim().length > 0;
}

export function buildNoModelResponseErrorMessage(totalTimeoutMs: number): string {
  const timeoutSeconds = Math.max(1, Math.round(totalTimeoutMs / 1000));
  return (
    `The session started but no response was received from Gemini after ${timeoutSeconds}s. ` +
    "Please retry and check API quota/model availability."
  );
}
