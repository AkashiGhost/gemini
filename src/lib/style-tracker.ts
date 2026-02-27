// ─────────────────────────────────────────────
// Style Tracker
// Tracks and resolves player therapy style scores
// ─────────────────────────────────────────────

import type { StoryState, PlayerStyleScores, PlayerStyle } from "./types/story-state";
import { STYLE_TIE_BREAK_ORDER } from "./types/story-state";
import type { EmotionalRegister } from "./types/intent";

/** Points awarded per consistent emotional register from intent */
const INTENT_SCORE_DELTA = 0.5;

/** Map emotional registers to player styles */
const REGISTER_TO_STYLE: Record<EmotionalRegister, PlayerStyle | null> = {
  empathetic: "empathetic",
  analytical: "analytical",
  nurturing: "nurturing",
  confrontational: "confrontational",
  neutral: null,
};

/**
 * Apply style scores from a choice option.
 * Called when the player selects a choice.
 */
export function applyChoiceScore(
  state: StoryState,
  scores: Record<string, number>,
): StoryState {
  const newScores = { ...state.playerStyleScores };

  for (const [style, delta] of Object.entries(scores)) {
    const key = style as PlayerStyle;
    if (key in newScores) {
      newScores[key] += delta;
    }
  }

  return { ...state, playerStyleScores: newScores };
}

/**
 * Apply a small score increment based on the player's emotional register.
 * Called after each player utterance is classified.
 */
export function applyIntentScore(
  state: StoryState,
  register: EmotionalRegister,
): StoryState {
  const style = REGISTER_TO_STYLE[register];
  if (!style) return state;

  return {
    ...state,
    playerStyleScores: {
      ...state.playerStyleScores,
      [style]: state.playerStyleScores[style] + INTENT_SCORE_DELTA,
    },
  };
}

/**
 * Get the dominant player style.
 * Tie-break order: empathetic > nurturing > analytical > confrontational
 */
export function getDominantStyle(scores: PlayerStyleScores): PlayerStyle {
  let maxScore = -Infinity;
  let dominant: PlayerStyle = STYLE_TIE_BREAK_ORDER[0];

  for (const style of STYLE_TIE_BREAK_ORDER) {
    if (scores[style] > maxScore) {
      maxScore = scores[style];
      dominant = style;
    }
  }

  return dominant;
}

/**
 * Get a human-readable summary of style scores for debugging.
 */
export function formatStyleScores(scores: PlayerStyleScores): string {
  return STYLE_TIE_BREAK_ORDER.map(
    (s) => `${s}: ${scores[s].toFixed(1)}`,
  ).join(", ");
}
