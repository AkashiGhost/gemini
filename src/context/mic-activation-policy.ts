export interface MicActivationInput {
  status: "idle" | "connecting" | "playing" | "ended" | "error";
  openingTurnLocked: boolean;
  micCaptureStarted: boolean;
  micStartInFlight: boolean;
  textTurnMode: boolean;
  allowDuringOpeningTurn?: boolean;
}

export function shouldStartMicCapture(input: MicActivationInput): boolean {
  if (input.status !== "playing") return false;
  if (input.openingTurnLocked && !input.allowDuringOpeningTurn) return false;
  if (input.textTurnMode) return false;
  if (input.micCaptureStarted) return false;
  if (input.micStartInFlight) return false;
  return true;
}
