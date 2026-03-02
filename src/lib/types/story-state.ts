// ─────────────────────────────────────────────
// Story State — runtime game state managed by the state machine
// ─────────────────────────────────────────────

export interface PlayerStyleScores {
  empathetic: number;
  analytical: number;
  nurturing: number;
  confrontational: number;
}

export type PlayerStyle = keyof PlayerStyleScores;

export const STYLE_TIE_BREAK_ORDER: PlayerStyle[] = [
  "empathetic",
  "nurturing",
  "analytical",
  "confrontational",
];

export interface CharacterState {
  emotionalState: string;
  trustLevel: number;
  secretsRevealed: string[];
  currentPhaseBehavior: string;
  arcStageIndex: number;
  activeVariant: string | null;
}

export interface GameFlags {
  [key: string]: boolean | string | number;
}

export interface StoryState {
  /** Current game status */
  status: "not_started" | "playing" | "ended";

  /** Current phase index (0-based into arc.phases) */
  currentPhaseIndex: number;

  /** Current beat index within the current phase (0-based) */
  currentBeatIndex: number;

  /** Elapsed seconds since game start */
  elapsedSeconds: number;

  /** AI character's runtime state */
  elara: CharacterState;

  /** Accumulated player style scores */
  playerStyleScores: PlayerStyleScores;

  /** Game flags set by beat/choice state_changes */
  flags: GameFlags;

  /** Choices the player has made: beatId → optionId */
  choicesMade: Record<string, string>;

  /** Which ending was triggered (null until game over) */
  endingId: string | null;

  /** Which revelation variant was selected (null until Phase 4) */
  revelationVariant: string | null;

  /** Conversation history for context building */
  conversationHistory: ConversationTurn[];

  /** Sounds that have been removed from the ambient mix */
  soundsRemoved: string[];
}

export interface ConversationTurn {
  role: "player" | "elara";
  text: string;
  timestamp: number;
}

// === Reducer Actions ===

export type StoryAction =
  | { type: "INIT" }
  | { type: "ADVANCE_BEAT" }
  | { type: "ADVANCE_PHASE" }
  | { type: "RESOLVE_CHOICE"; beatId: string; optionId: string; stateChanges: Record<string, unknown>; styleScore?: Record<string, number> }
  | { type: "APPLY_STATE_CHANGES"; changes: Record<string, unknown> }
  | { type: "ADD_CONVERSATION_TURN"; turn: ConversationTurn }
  | { type: "SET_REVELATION_VARIANT"; variant: string }
  | { type: "SET_ENDING"; endingId: string }
  | { type: "TICK"; elapsedSeconds: number }
  | { type: "REMOVE_SOUND"; soundId: string }
  | { type: "SET_STATUS"; status: StoryState["status"] };
