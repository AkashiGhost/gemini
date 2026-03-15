export interface TranscriptIntentCueRule {
  soundId: string;
  keywords: readonly string[];
}

export const TRANSCRIPT_INTENT_CUE_RULES: Record<string, readonly TranscriptIntentCueRule[]> = {
  "the-call": [
    {
      soundId: "footsteps",
      keywords: [
        "run",
        "running",
        "sprint",
        "jog",
        "walk",
        "walking",
        "approach",
        "approaching",
        "hurry",
        "footsteps",
      ],
    },
    {
      soundId: "door_creak",
      keywords: [
        "open the door",
        "push the door",
        "crack the door",
        "ease the door",
        "creak",
      ],
    },
    {
      soundId: "door_slam",
      keywords: [
        "slam the door",
        "slamming the door",
        "shut the door",
        "bang the door",
        "door slam",
      ],
    },
    {
      soundId: "keypad_beep",
      keywords: [
        "keypad",
        "key code",
        "type the code",
        "enter code",
        "press the keypad",
        "punch in the code",
        "tap the keys",
        "buttons",
        "beep",
      ],
    },
    {
      soundId: "metal_scrape",
      keywords: ["scrape", "scraping", "drag metal", "metal grate", "vent"],
    },
    {
      soundId: "pipe_clank",
      keywords: ["pipe", "clank", "hit the pipe", "tap the pipe"],
    },
    {
      soundId: "water_drip",
      keywords: ["water", "drip", "leak", "dripping", "running water", "water starts"],
    },
    {
      soundId: "heavy_breathing",
      keywords: ["breathe", "breathing", "panting", "gasping", "out of breath"],
    },
    {
      soundId: "glass_break",
      keywords: ["break the glass", "shatter", "glass"],
    },
  ],
};

export const AUDIO_CONFIG = {
  engineInitDelayMs: 0,
  cueCooldownMs: 8_000,
  transcriptIntentFallbackDelayMs: 900,
  transcriptIntentToolPriorityWindowMs: 2_200,
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
