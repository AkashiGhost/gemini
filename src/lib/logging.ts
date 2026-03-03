import { DEBUG_CONFIG, type LogLevel } from "@/lib/config/debug";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  off: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

function shouldLog(level: Exclude<LogLevel, "off">): boolean {
  if (!DEBUG_CONFIG.enableStructuredLogs) return false;
  return LOG_LEVEL_PRIORITY[level] <= LOG_LEVEL_PRIORITY[DEBUG_CONFIG.logLevel];
}

function normalizeError(error: unknown): Record<string, unknown> | undefined {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { value: String(error) };
}

export function extendCausalChain(
  chain: string[] | undefined,
  ...links: Array<string | undefined>
): string[] {
  const next = [...(chain ?? [])];
  for (const link of links) {
    if (typeof link === "string" && link.length > 0) next.push(link);
  }
  return next;
}

export interface StructuredLogFields {
  event: string;
  sessionId?: string;
  causalChain?: string[];
  data?: Record<string, unknown>;
  error?: unknown;
}

function emitLog(
  level: Exclude<LogLevel, "off">,
  component: string,
  fields: StructuredLogFields,
): void {
  if (!shouldLog(level)) return;

  const record = {
    ts: new Date().toISOString(),
    level,
    component,
    event: fields.event,
    sessionId: fields.sessionId,
    causalChain: fields.causalChain,
    data: fields.data,
    error: normalizeError(fields.error),
  };

  const payload = JSON.stringify(record);
  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else if (level === "info") {
    console.info(payload);
  } else {
    console.debug(payload);
  }
}

export function createLogger(component: string) {
  return {
    debug: (fields: StructuredLogFields) => emitLog("debug", component, fields),
    info: (fields: StructuredLogFields) => emitLog("info", component, fields),
    warn: (fields: StructuredLogFields) => emitLog("warn", component, fields),
    error: (fields: StructuredLogFields) => emitLog("error", component, fields),
  };
}

