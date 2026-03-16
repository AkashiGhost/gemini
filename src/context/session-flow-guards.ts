export interface SilenceNudgeDecisionInput {
  status: "idle" | "connecting" | "playing" | "ended" | "error";
  isSpeaking: boolean;
  isPaused: boolean;
  hasAiSpoken: boolean;
  openingTurnLocked: boolean;
}

export function shouldScheduleSilenceNudge(input: SilenceNudgeDecisionInput): boolean {
  if (input.status !== "playing") return false;
  if (input.isSpeaking || input.isPaused) return false;
  if (!input.hasAiSpoken) return false;
  if (input.openingTurnLocked) return false;
  return true;
}

export interface OpeningTurnMicArmDecisionInput {
  openingTurnLocked: boolean;
  responseReceived: boolean;
  hasAudio: boolean;
  textTurnMode: boolean;
}

export function shouldArmOpeningTurnMic(input: OpeningTurnMicArmDecisionInput): boolean {
  if (!input.openingTurnLocked) return false;
  if (!input.responseReceived) return false;
  if (!input.hasAudio) return false;
  if (input.textTurnMode) return false;
  return true;
}
