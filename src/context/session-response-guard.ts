export interface ModelResponseSignal {
  hasAudio: boolean;
  modelText?: string;
  outputTranscriptionText?: string;
}

export function didReceiveModelResponse(signal: ModelResponseSignal): boolean {
  if (signal.hasAudio) return true;
  if (typeof signal.modelText === "string" && signal.modelText.trim().length > 0) return true;
  if (typeof signal.outputTranscriptionText !== "string") return false;
  return signal.outputTranscriptionText.trim().length > 0;
}

export function buildNoModelResponseErrorMessage(totalTimeoutMs: number): string {
  const timeoutSeconds = Math.max(1, Math.round(totalTimeoutMs / 1000));
  return (
    `The session started but Gemini did not produce the opening turn within ${timeoutSeconds}s. ` +
    "Please retry. If this keeps happening, inspect Live session logs and service health."
  );
}
