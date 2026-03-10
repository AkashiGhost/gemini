export interface AiTurnFinalizationPolicyInput {
  openingTurnLocked: boolean;
  textTurnMode: boolean;
}

export function shouldFinalizeTurnOnGenerationComplete({
  openingTurnLocked,
  textTurnMode,
}: AiTurnFinalizationPolicyInput): boolean {
  if (openingTurnLocked) return true;
  if (textTurnMode) return false;
  return true;
}
