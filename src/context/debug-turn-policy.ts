type DebugTurnPolicyInput = {
  status: "idle" | "connecting" | "playing" | "ended" | "error";
  isPaused: boolean;
  turnInputReady: boolean;
  hasSession: boolean;
  text: string;
};

export function canSendDebugTurn({
  status,
  isPaused,
  turnInputReady,
  hasSession,
  text,
}: DebugTurnPolicyInput): boolean {
  if (status !== "playing") return false;
  if (isPaused) return false;
  if (!turnInputReady) return false;
  if (!hasSession) return false;
  return text.trim().length > 0;
}
