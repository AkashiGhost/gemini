export type LogLevel = "off" | "error" | "warn" | "info" | "debug";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseLogLevel(value: string | undefined, fallback: LogLevel): LogLevel {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "off" ||
    normalized === "error" ||
    normalized === "warn" ||
    normalized === "info" ||
    normalized === "debug"
  ) {
    return normalized;
  }
  return fallback;
}

export const DEBUG_CONFIG = {
  logLevel: parseLogLevel(
    process.env.NEXT_PUBLIC_LOG_LEVEL ?? process.env.LOG_LEVEL,
    "info",
  ),
  enableStructuredLogs: parseBoolean(
    process.env.NEXT_PUBLIC_ENABLE_STRUCTURED_LOGS ?? process.env.ENABLE_STRUCTURED_LOGS,
    true,
  ),
  enableKeywordCueFallback: parseBoolean(
    process.env.NEXT_PUBLIC_ENABLE_KEYWORD_CUE_FALLBACK,
    true,
  ),
} as const;

