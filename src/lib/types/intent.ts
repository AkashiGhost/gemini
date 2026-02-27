// ─────────────────────────────────────────────
// Intent Classification Types
// Mirrors system.yaml intent_classifier_prompt output
// ─────────────────────────────────────────────

export type IntentType =
  | "speak_to_elara"
  | "ask_question"
  | "express_emotion"
  | "try_to_leave"
  | "try_phone"
  | "try_call_help"
  | "try_end_session"
  | "stand_up"
  | "look_around"
  | "silence"
  | "other";

export type EmotionalRegister =
  | "empathetic"
  | "analytical"
  | "nurturing"
  | "confrontational"
  | "neutral";

export type ChallengeLevel = "low" | "medium" | "high";

export interface IntentResult {
  intent: IntentType;
  emotionalRegister: EmotionalRegister;
  keyPhrase: string;
  challengeLevel: ChallengeLevel;
  rawInput: string;
}

/** Intent types that map to player_cannot constraints */
export const BLOCKED_INTENTS: Record<IntentType, string | null> = {
  try_to_leave: "leave",
  try_phone: "phone",
  try_call_help: "call_help",
  try_end_session: "end_session",
  stand_up: null,       // allowed in player_can
  speak_to_elara: null,
  ask_question: null,
  express_emotion: null,
  look_around: null,
  silence: null,
  other: null,
};
