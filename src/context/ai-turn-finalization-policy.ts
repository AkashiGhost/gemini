export interface AiTurnFinalizationPolicyInput {
  openingTurnLocked: boolean;
  textTurnMode: boolean;
}

const TEXT_TURN_GENERATION_COMPLETE_FALLBACK_DELAY_MS = 2000;

export function shouldFinalizeTurnOnGenerationComplete({
  openingTurnLocked,
  textTurnMode,
}: AiTurnFinalizationPolicyInput): boolean {
  if (openingTurnLocked) return true;
  if (textTurnMode) return false;
  return true;
}

export function getGenerationCompleteFinalizeFallbackDelayMs({
  openingTurnLocked,
  textTurnMode,
}: AiTurnFinalizationPolicyInput): number | null {
  if (openingTurnLocked) return null;
  if (!textTurnMode) return null;
  return TEXT_TURN_GENERATION_COMPLETE_FALLBACK_DELAY_MS;
}
