// ─────────────────────────────────────────────
// LLM Adapter Interfaces — provider-agnostic
// Implemented by GeminiAdapter, NovaAdapter, MockAdapter
// ─────────────────────────────────────────────

import type { IntentResult } from "./intent";

export interface LLMTurn {
  /** Text response from the model (includes [SOUND:x] markers) */
  text: string;
  /** Raw audio bytes for TTS (PCM 24kHz, base64 in WebSocket) */
  audioChunks?: ArrayBuffer[];
  /** Whether this was a fallback response */
  isFallback?: boolean;
  /** True when Gemini signals it was interrupted mid-turn (user barge-in) */
  interrupted?: boolean;
}

/**
 * Story Engine — generates narrative responses.
 * One instance per session. Manages conversation context internally.
 */
export interface StoryEngine {
  /** Initialize the engine with a system prompt */
  initialize(systemPrompt: string, voice?: string): Promise<void>;

  /** Send player input and get Elara's response */
  generateResponse(
    playerText: string,
    stateSnapshot: Record<string, unknown>,
  ): Promise<LLMTurn>;

  /** Send raw audio and get streamed audio + text response */
  generateAudioResponse?(
    audioChunk: ArrayBuffer,
    stateSnapshot: Record<string, unknown>,
  ): AsyncGenerator<LLMTurn>;

  /** Clean up resources (close WebSocket, etc.) */
  destroy(): Promise<void>;
}

/**
 * Intent Parser — classifies player speech into structured intent.
 * Uses a fast/cheap model (Gemini Flash Lite, Nova Lite, Mistral Small).
 */
export interface IntentParser {
  /** Parse player text into a structured intent */
  parse(playerText: string, intentClassifierPrompt?: string): Promise<IntentResult>;
}

// === WebSocket Protocol ===

export type ClientMessageType =
  | "INIT"
  | "AUDIO_CHUNK"
  | "CHOICE_SELECTED"
  | "PING";

export type ServerMessageType =
  | "SESSION_READY"
  | "AUDIO_CHUNK"
  | "SOUND_CUE"
  | "CHOICE_PROMPT"
  | "STATE_UPDATE"
  | "PHASE_TRANSITION"
  | "GAME_OVER"
  | "INTERRUPTED"
  | "ERROR"
  | "PONG";

export interface ClientMessage {
  type: ClientMessageType;
  payload?: unknown;
}

export interface ServerMessage {
  type: ServerMessageType;
  payload?: unknown;
}

export interface InitPayload {
  gameId: string;
  provider?: "gemini" | "nova" | "mock";
}

export interface AudioChunkPayload {
  audio: string; // base64
  sampleRate: number;
}

export interface ChoiceSelectedPayload {
  beatId: string;
  optionId: string;
}

export interface SessionReadyPayload {
  sessionId: string;
  gameMeta: {
    title: string;
    genre: string;
    playerRole: string;
    durationTargetMinutes: number;
  };
}

export interface SoundCuePayload {
  soundId: string;
  position: number;
}

export interface ChoicePromptPayload {
  beatId: string;
  options: Array<{
    id: string;
    label: string;
  }>;
}

export interface PhaseTransitionPayload {
  phaseIndex: number;
  phaseId: string;
  phaseName: string;
}

export interface GameOverPayload {
  endingId: string;
  endingName?: string;
}
