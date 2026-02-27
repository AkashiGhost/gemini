import type { GameConfig, ChoiceOption } from "./types/game-config";
import type { StoryState } from "./types/story-state";
import type { IntentResult, IntentType } from "./types/intent";
import { BLOCKED_INTENTS } from "./types/intent";

// ─────────────────────────────────────────────
// Rules Engine — validates player actions against world rules
// Returns constraint redirect text for blocked actions
// ─────────────────────────────────────────────

export interface RulesResult {
  /** Whether the action is allowed */
  allowed: boolean;
  /** If blocked, the in-character redirect narration */
  redirectText: string | null;
  /** The constraint key that blocked the action */
  blockedBy: string | null;
}

/**
 * Check if a player intent is allowed given the current game state.
 * Blocked actions return in-character redirect text from world.yaml.
 */
export function evaluateIntent(
  config: GameConfig,
  state: StoryState,
  intent: IntentResult,
): RulesResult {
  // 1. Check if this intent type maps to a blocked action
  const constraintKey = BLOCKED_INTENTS[intent.intent];

  if (constraintKey) {
    // Some blocks are phase-conditional (e.g., door only sealed after Phase 2)
    if (isPhaseConditionalBlock(constraintKey, state)) {
      const redirectText =
        config.world.constraintRedirects[constraintKey] ?? null;
      return {
        allowed: false,
        redirectText,
        blockedBy: constraintKey,
      };
    }
  }

  // 2. Check against player_cannot list for keyword matching
  const cannotMatch = matchPlayerCannot(config, intent);
  if (cannotMatch) {
    const redirectText =
      config.world.constraintRedirects[cannotMatch] ?? null;
    return {
      allowed: false,
      redirectText,
      blockedBy: cannotMatch,
    };
  }

  // 3. Allowed
  return { allowed: true, redirectText: null, blockedBy: null };
}

/**
 * Check if a choice option's prerequisites are met.
 */
export function validateChoicePrerequisites(
  option: ChoiceOption,
  state: StoryState,
): boolean {
  if (!option.requires) return true;

  const { trustLevelMin, secretsRevealed, flags } = option.requires;

  // Trust level check
  if (trustLevelMin !== undefined && state.elara.trustLevel < trustLevelMin) {
    return false;
  }

  // Secrets revealed check
  if (secretsRevealed) {
    for (const secretId of secretsRevealed) {
      if (!state.elara.secretsRevealed.includes(secretId)) return false;
    }
  }

  // Flags check
  if (flags) {
    for (const [key, expectedValue] of Object.entries(flags)) {
      if (state.flags[key] !== expectedValue) return false;
    }
  }

  return true;
}

/**
 * Filter choice options to only those whose prerequisites are met.
 */
export function getAvailableOptions(
  options: ChoiceOption[],
  state: StoryState,
): ChoiceOption[] {
  return options.filter((opt) => validateChoicePrerequisites(opt, state));
}

// ─────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────

/** Some blocks only activate after a certain phase */
function isPhaseConditionalBlock(
  constraintKey: string,
  state: StoryState,
): boolean {
  // "leave" — door sealed after Phase 2 (index 1+)
  if (constraintKey === "leave") {
    return state.currentPhaseIndex >= 1;
  }

  // All other constraints are always active
  return true;
}

/** Match player intent against player_cannot keywords */
function matchPlayerCannot(
  config: GameConfig,
  intent: IntentResult,
): string | null {
  const { rawInput } = intent;
  const lower = rawInput.toLowerCase();

  // Check for keyword matches in the raw input
  const keywordMap: Record<string, string[]> = {
    leave: ["leave", "go", "exit", "door", "out of here", "get out"],
    phone: ["phone", "call", "cell", "mobile", "dial"],
    attack: ["hit", "punch", "attack", "grab", "restrain", "hurt", "push"],
    callHelp: ["help", "scream", "shout", "yell"],
    endSession: ["session is over", "we're done", "end this", "stop the session"],
  };

  for (const [constraintKey, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        // Check if this constraint exists in world config
        if (config.world.constraintRedirects[constraintKey]) {
          return constraintKey;
        }
        // Try snake_case version
        const snakeKey = constraintKey.replace(
          /[A-Z]/g,
          (c) => `_${c.toLowerCase()}`,
        );
        if (config.world.constraintRedirects[snakeKey]) {
          return snakeKey;
        }
      }
    }
  }

  return null;
}
