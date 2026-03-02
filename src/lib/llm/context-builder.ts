// ─────────────────────────────────────────────
// Context Builder
// Assembles the 5-layer system prompt per system.yaml context_layer_order:
//   1. World rules + character card (~600 tokens)
//   2. Current phase override (~300 tokens)
//   3. Recent exchange summary (~400 tokens)
//   4. Compressed history (~200 tokens)
//   5. Active state snapshot (~100 tokens)
// ─────────────────────────────────────────────

import type { GameConfig, Phase, Beat } from "../types/game-config";
import type { StoryState, ConversationTurn } from "../types/story-state";

const MAX_RECENT_TURNS = 6; // Last 3 exchanges (player + elara each)
const MAX_COMPRESSED_TURNS = 20;

export interface BuiltContext {
  systemPrompt: string;
  userPrefix: string;
}

/**
 * Build the complete system prompt for a story LLM call.
 */
export function buildContext(
  config: GameConfig,
  state: StoryState,
  currentPhase: Phase,
  currentBeat: Beat | null,
): BuiltContext {
  const layers: string[] = [];

  // Layer 1: World rules + character card
  layers.push(buildWorldAndCharacterLayer(config));

  // Layer 2: Current phase override
  layers.push(buildPhaseOverrideLayer(config, currentPhase, currentBeat));

  // Layer 3: Recent exchange summary
  layers.push(buildRecentExchangeLayer(state));

  // Layer 4: Compressed history
  layers.push(buildCompressedHistoryLayer(state));

  // Layer 5: Active state snapshot
  layers.push(buildStateSnapshotLayer(state, currentPhase));

  const systemPrompt = layers.filter(Boolean).join("\n\n---\n\n");

  // User prefix — response length constraint injected per call
  const userPrefix = config.prompts.system.responseLengthConstraint || "";

  return { systemPrompt, userPrefix };
}

// ─────────────────────────────────────────────
// Layer builders
// ─────────────────────────────────────────────

function buildWorldAndCharacterLayer(config: GameConfig): string {
  const parts: string[] = [];

  // Base instruction from system.yaml
  parts.push(config.prompts.system.baseInstruction);

  // World physics rules
  const { physics, setting } = config.world;
  parts.push(`SETTING: ${setting.description}`);
  parts.push(`TIME: ${setting.time}`);
  parts.push(`PHYSICS: ${physics.type}`);
  parts.push(`RULES:\n${physics.rules.map((r) => `- ${r}`).join("\n")}`);

  // Character card (first character = Elara)
  const char = config.characters[0];
  if (char) {
    parts.push(`CHARACTER: ${char.name} (${char.role})`);
    parts.push(`VOICE: ${char.voice.description}`);
    parts.push(
      `MAX SENTENCES: ${char.voice.maxSentencesPerResponse}`,
    );
    parts.push(
      `FORBIDDEN: ${(char.voice.forbiddenPhrases ?? []).join(", ")}`,
    );
  }

  return parts.join("\n\n");
}

function buildPhaseOverrideLayer(
  config: GameConfig,
  currentPhase: Phase,
  currentBeat: Beat | null,
): string {
  const parts: string[] = [];

  // Phase override from phase-overrides.yaml
  // Convert snake_case phase id to camelCase to match transformed config keys
  // e.g. "ordinary_world" → "ordinaryWorld" (transformKeys runs on load)
  const overrideKey = currentPhase.id.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  const phaseOverrides = config.prompts.phaseOverrides;
  const override = phaseOverrides[overrideKey as keyof typeof phaseOverrides];

  if (override) {
    // Override can be a string or an object with an 'override' field
    const text =
      typeof override === "string"
        ? override
        : (override as { override?: string }).override ?? "";
    if (text) parts.push(text);
  }

  // Current phase purpose
  parts.push(`PHASE PURPOSE: ${currentPhase.purpose}`);

  // Current beat purpose
  if (currentBeat) {
    parts.push(`CURRENT BEAT: [${currentBeat.type}] ${currentBeat.purpose}`);
    parts.push(`WORD BUDGET: ${currentBeat.wordBudget} words`);
    if (currentBeat.promptHint) {
      parts.push(`HINT: ${currentBeat.promptHint}`);
    }
  }

  return parts.join("\n\n");
}

function buildRecentExchangeLayer(state: StoryState): string {
  const recent = state.conversationHistory.slice(-MAX_RECENT_TURNS);
  if (recent.length === 0) return "RECENT EXCHANGES: (session just started)";

  const lines = recent.map((turn) => {
    const speaker = turn.role === "player" ? "THERAPIST" : "ELARA";
    // Truncate long turns
    const text =
      turn.text.length > 200
        ? turn.text.slice(0, 200) + "..."
        : turn.text;
    return `${speaker}: ${text}`;
  });

  return `RECENT EXCHANGES:\n${lines.join("\n")}`;
}

function buildCompressedHistoryLayer(state: StoryState): string {
  // Only compress if we have more turns than the recent window
  if (state.conversationHistory.length <= MAX_RECENT_TURNS) {
    return "";
  }

  const older = state.conversationHistory.slice(
    0,
    Math.min(-MAX_RECENT_TURNS + state.conversationHistory.length, MAX_COMPRESSED_TURNS),
  );

  if (older.length === 0) return "";

  // Compress to one-line summaries
  const summaries: string[] = [];
  for (let i = 0; i < older.length; i += 2) {
    const playerTurn = older[i];
    const elaraTurn = older[i + 1];
    if (playerTurn) {
      const playerSnippet = playerTurn.text.slice(0, 60);
      const elaraSnippet = elaraTurn
        ? elaraTurn.text.slice(0, 60)
        : "(no response)";
      summaries.push(`T: ${playerSnippet}... → E: ${elaraSnippet}...`);
    }
  }

  return `EARLIER CONTEXT:\n${summaries.join("\n")}`;
}

function buildStateSnapshotLayer(
  state: StoryState,
  currentPhase: Phase,
): string {
  const snapshot = {
    current_phase: currentPhase.id,
    phase_index: state.currentPhaseIndex,
    beat_index: state.currentBeatIndex,
    elapsed_seconds: state.elapsedSeconds,
    trust_level: state.elara.trustLevel,
    emotional_state: state.elara.emotionalState,
    secrets_revealed: state.elara.secretsRevealed,
    player_style_scores: state.playerStyleScores,
    sounds_removed: state.soundsRemoved,
    choices_made: state.choicesMade,
    active_variant: state.elara.activeVariant,
  };

  return `STATE:\n${JSON.stringify(snapshot, null, 2)}`;
}
