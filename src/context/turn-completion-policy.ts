const PLAYBACK_SETTLE_MS = 75;

export interface OpeningTurnUnlockDecision {
  unlockNow: boolean;
  unlockAfterMs: number;
}

export function getOpeningTurnUnlockDecision(remainingPlaybackMs: number): OpeningTurnUnlockDecision {
  const normalizedRemainingMs = Number.isFinite(remainingPlaybackMs)
    ? Math.max(0, Math.ceil(remainingPlaybackMs))
    : 0;

  if (normalizedRemainingMs === 0) {
    return {
      unlockNow: true,
      unlockAfterMs: 0,
    };
  }

  return {
    unlockNow: false,
    unlockAfterMs: normalizedRemainingMs + PLAYBACK_SETTLE_MS,
  };
}
