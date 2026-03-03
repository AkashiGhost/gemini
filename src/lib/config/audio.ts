export const AUDIO_CONFIG = {
  engineInitDelayMs: 0,
  cueCooldownMs: 30_000,
  defaultCueVolume: 0.5,
  endGameFadeOutSeconds: 2,
  timelinePollIntervalMs: 100,
  ttsDucking: {
    reductionDb: -6,
    fadeInMs: 300,
    fadeOutMs: 600,
  },
  crossfadeDefaultMs: 2_000,
} as const;
