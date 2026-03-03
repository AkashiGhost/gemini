import type { FunctionCall, FunctionDeclaration, Tool } from "@google/genai";

export const LIVE_TOOL_NAMES = ["trigger_sound", "set_tension", "end_game"] as const;
export type LiveToolName = (typeof LIVE_TOOL_NAMES)[number];

export interface TensionPhaseThreshold {
  minTension: number;
  phase: number;
}

export const TENSION_PHASE_THRESHOLDS: TensionPhaseThreshold[] = [
  { minTension: 0, phase: 0 },
  { minTension: 0.2, phase: 1 },
  { minTension: 0.4, phase: 2 },
  { minTension: 0.65, phase: 3 },
  { minTension: 0.85, phase: 4 },
];

function parseCsvList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const liveModelFromEnv = process.env.NEXT_PUBLIC_GEMINI_LIVE_MODEL?.trim();
const liveFallbackModelsFromEnv = parseCsvList(process.env.NEXT_PUBLIC_GEMINI_LIVE_MODEL_FALLBACKS);
const primaryLiveModel = liveModelFromEnv && liveModelFromEnv.length > 0
  ? liveModelFromEnv
  : "gemini-2.5-flash-native-audio-latest";
const defaultFallbackModels = ["gemini-2.5-flash-native-audio", "gemini-live-2.5-flash-native-audio"];
const liveFallbackModels = (liveFallbackModelsFromEnv.length > 0 ? liveFallbackModelsFromEnv : defaultFallbackModels)
  .filter((modelName) => modelName !== primaryLiveModel);

export const LIVE_RUNTIME_CONFIG = {
  modelName: primaryLiveModel,
  fallbackModelNames: liveFallbackModels,
  connectTimeoutMs: 15_000,
  voiceName: "Charon",
  silenceNudgeMs: 12_000,
  realtimeInputSilenceDurationMs: 1_200,
  ephemeralTokenLifetimeMs: 60 * 60 * 1000,
} as const;

export interface TriggerSoundToolCallEvent {
  name: "trigger_sound";
  callId: string;
  sessionId?: string;
  receivedAtMs: number;
  causalChain: string[];
  rawArgs: Record<string, unknown>;
  args: {
    soundId: string;
    volume?: number;
    loop?: boolean;
    fadeInSeconds?: number;
  };
}

export interface SetTensionToolCallEvent {
  name: "set_tension";
  callId: string;
  sessionId?: string;
  receivedAtMs: number;
  causalChain: string[];
  rawArgs: Record<string, unknown>;
  args: {
    tension: number;
    phase?: number;
    transitionSeconds?: number;
  };
}

export interface EndGameToolCallEvent {
  name: "end_game";
  callId: string;
  sessionId?: string;
  receivedAtMs: number;
  causalChain: string[];
  rawArgs: Record<string, unknown>;
  args: {
    reason?: string;
    fadeOutSeconds?: number;
  };
}

export type LiveToolCallEvent =
  | TriggerSoundToolCallEvent
  | SetTensionToolCallEvent
  | EndGameToolCallEvent;

export type LiveToolCallListener = (toolCall: LiveToolCallEvent) => void;

export const LIVE_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "trigger_sound",
    description:
      "Play a specific one-shot or looping sound effect in the current scene.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        sound_id: { type: "string", description: "Sound identifier to trigger." },
        volume: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Optional gain from 0.0 to 1.0.",
        },
        loop: {
          type: "boolean",
          description: "Whether to keep the sound looping.",
        },
        fade_in_seconds: {
          type: "number",
          minimum: 0,
          maximum: 30,
          description: "Optional fade-in time in seconds.",
        },
      },
      required: ["sound_id"],
      additionalProperties: false,
    },
  },
  {
    name: "set_tension",
    description:
      "Update narrative tension for atmosphere control. Use 0.0-1.0 (or 0-100 percent).",
    parametersJsonSchema: {
      type: "object",
      properties: {
        tension: {
          type: "number",
          description: "Normalized tension in range 0.0-1.0 (or percent 0-100).",
        },
        phase: {
          type: "integer",
          minimum: 0,
          maximum: 4,
          description: "Optional direct phase override when explicitly needed.",
        },
        transition_seconds: {
          type: "number",
          minimum: 0,
          maximum: 30,
          description: "Optional transition/crossfade duration in seconds. Default 4.",
        },
      },
      required: ["tension"],
      additionalProperties: false,
    },
  },
  {
    name: "end_game",
    description: "End the current game session gracefully.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Optional reason for ending the game.",
        },
        fade_out_seconds: {
          type: "number",
          minimum: 0,
          maximum: 30,
          description: "Optional audio fade-out duration before end.",
        },
      },
      additionalProperties: false,
    },
  },
];

export const LIVE_TOOL_DECLARATIONS: Tool[] = [
  { functionDeclarations: LIVE_FUNCTION_DECLARATIONS },
];

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value !== "number") return undefined;
  return Number.isFinite(value) ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asInteger(value: unknown): number | undefined {
  const numberValue = asNumber(value);
  if (numberValue == null) return undefined;
  const intValue = Math.trunc(numberValue);
  return Number.isFinite(intValue) ? intValue : undefined;
}

export function normalizeTensionValue(value: unknown): number | undefined {
  const raw = asNumber(value);
  if (raw == null) return undefined;
  if (raw > 1) return Math.min(1, Math.max(0, raw / 100));
  return Math.min(1, Math.max(0, raw));
}

export function tensionToPhase(
  tension: number,
  thresholds: TensionPhaseThreshold[] = TENSION_PHASE_THRESHOLDS,
): number {
  const normalized = Math.min(1, Math.max(0, tension));
  let phase = thresholds[0]?.phase ?? 0;
  for (const threshold of thresholds) {
    if (normalized >= threshold.minTension) phase = threshold.phase;
  }
  return phase;
}

export function isLiveToolName(name: string | undefined): name is LiveToolName {
  return typeof name === "string" && LIVE_TOOL_NAMES.includes(name as LiveToolName);
}

export function parseLiveToolCall(
  functionCall: FunctionCall,
  options: {
    sessionId?: string;
    causalChain?: string[];
    nowMs?: number;
  } = {},
): LiveToolCallEvent | null {
  if (!isLiveToolName(functionCall.name)) return null;

  const nowMs = options.nowMs ?? Date.now();
  const callId = functionCall.id ?? `${functionCall.name}-${nowMs}`;
  const rawArgs = asRecord(functionCall.args);
  const baseChain = [...(options.causalChain ?? []), `tool:${functionCall.name}`, `call:${callId}`];

  if (functionCall.name === "trigger_sound") {
    const soundId = asString(rawArgs.sound_id ?? rawArgs.soundId);
    if (!soundId) return null;
    return {
      name: "trigger_sound",
      callId,
      sessionId: options.sessionId,
      receivedAtMs: nowMs,
      causalChain: baseChain,
      rawArgs,
      args: {
        soundId,
        volume: asNumber(rawArgs.volume),
        loop: asBoolean(rawArgs.loop),
        fadeInSeconds: asNumber(rawArgs.fade_in_seconds ?? rawArgs.fadeInSeconds),
      },
    };
  }

  if (functionCall.name === "set_tension") {
    const tension = normalizeTensionValue(rawArgs.tension ?? rawArgs.value ?? rawArgs.level);
    if (tension == null) return null;
    return {
      name: "set_tension",
      callId,
      sessionId: options.sessionId,
      receivedAtMs: nowMs,
      causalChain: baseChain,
      rawArgs,
      args: {
        tension,
        phase: asInteger(rawArgs.phase),
        transitionSeconds: asNumber(
          rawArgs.transition_seconds ?? rawArgs.transitionSeconds ?? rawArgs.transition,
        ),
      },
    };
  }

  return {
    name: "end_game",
    callId,
    sessionId: options.sessionId,
    receivedAtMs: nowMs,
    causalChain: baseChain,
    rawArgs,
    args: {
      reason: asString(rawArgs.reason),
      fadeOutSeconds: asNumber(rawArgs.fade_out_seconds ?? rawArgs.fadeOutSeconds),
    },
  };
}
