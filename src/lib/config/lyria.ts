export interface LyriaConfig {
  model: string;
  reconnectAttempts: number;
  baseGain: number;
  transitionSeconds: number;
  tokenEndpoint: string;
  fallbackSampleRate: number;
  initialTension: number;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

const lyriaModelFromEnv = process.env.NEXT_PUBLIC_LYRIA_MODEL?.trim();

export const LYRIA_DEFAULT_CONFIG: Readonly<LyriaConfig> = Object.freeze({
  model: lyriaModelFromEnv && lyriaModelFromEnv.length > 0 ? lyriaModelFromEnv : "models/lyria-realtime-exp",
  reconnectAttempts: 1,
  baseGain: 0.3,
  transitionSeconds: 4,
  tokenEndpoint: "/api/lyria-token",
  fallbackSampleRate: 24000,
  initialTension: 0.35,
});

export const LYRIA_RUNTIME_CONFIG = Object.freeze({
  enabled: parseBoolean(process.env.NEXT_PUBLIC_ENABLE_LYRIA_REALTIME, false),
});

export function clampUnitValue(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function clampTension(value: number, fallback = LYRIA_DEFAULT_CONFIG.initialTension): number {
  return clampUnitValue(value, fallback);
}

export function createLyriaConfig(overrides: Partial<LyriaConfig> = {}): LyriaConfig {
  const reconnectAttempts = Number.isFinite(overrides.reconnectAttempts)
    ? Math.max(0, Math.trunc(overrides.reconnectAttempts as number))
    : LYRIA_DEFAULT_CONFIG.reconnectAttempts;

  const fallbackSampleRate = Number.isFinite(overrides.fallbackSampleRate)
    ? Math.max(8000, Math.trunc(overrides.fallbackSampleRate as number))
    : LYRIA_DEFAULT_CONFIG.fallbackSampleRate;

  return {
    model: typeof overrides.model === "string" && overrides.model.trim().length > 0
      ? overrides.model.trim()
      : LYRIA_DEFAULT_CONFIG.model,
    reconnectAttempts,
    baseGain: clampUnitValue(overrides.baseGain ?? Number.NaN, LYRIA_DEFAULT_CONFIG.baseGain),
    transitionSeconds: Number.isFinite(overrides.transitionSeconds)
      ? Math.max(0, overrides.transitionSeconds as number)
      : LYRIA_DEFAULT_CONFIG.transitionSeconds,
    tokenEndpoint: typeof overrides.tokenEndpoint === "string" && overrides.tokenEndpoint.trim().length > 0
      ? overrides.tokenEndpoint.trim()
      : LYRIA_DEFAULT_CONFIG.tokenEndpoint,
    fallbackSampleRate,
    initialTension: clampTension(overrides.initialTension ?? Number.NaN),
  };
}
