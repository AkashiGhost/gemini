export function isDebugTextSessionEnabled(search: string): boolean {
  return new URLSearchParams(search).get("debugText") === "1";
}

export function shouldUseMicrophoneInSession(debugTextMode: boolean): boolean {
  return !debugTextMode;
}

export function shouldUseSilenceNudgesInSession(debugTextMode: boolean): boolean {
  return !debugTextMode;
}
