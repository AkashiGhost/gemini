import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  CREATOR_STORY_PACK_LIMITS,
  type CreatorSpec,
  type CreatorStoryPack,
  type CreatorStoryPackPhase,
  type CreatorStoryPackRequestBody,
  type CreatorStoryPackResponseBody,
  type CreatorStoryPackSoundCue,
  CREATOR_TRACE_HEADER,
  CREATOR_INTERVIEW_MODEL,
  EMPTY_CREATOR_SPEC,
  EMPTY_CREATOR_STORY_PACK,
  resolveCreatorTraceId,
  sanitizeCreatorSpecPartial,
  sanitizeCreatorStoryDraftText,
} from "@/lib/config/creator";
import { createLogger } from "@/lib/logging";
import { evaluateCreatorStoryPackQuality } from "@/lib/creator/story-pack-quality";

export const runtime = "nodejs";
const logger = createLogger("api/creator/story-pack");

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeSessionId(sessionId: unknown): string | undefined {
  if (typeof sessionId !== "string") return undefined;
  const trimmed = sessionId.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 120);
}

function sanitizeText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value
    .trim()
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ");
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function sanitizeCueId(value: unknown, index: number): string {
  const candidate = sanitizeText(value, CREATOR_STORY_PACK_LIMITS.cueId);
  if (!candidate) return `cue-${index + 1}`;
  const normalized = candidate
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized || `cue-${index + 1}`;
}

function tryParseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

function extractFirstJsonChunk(raw: string): string | undefined {
  const startIndexes: number[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];
    if (char === "{" || char === "[") {
      startIndexes.push(index);
    }
  }

  for (const start of startIndexes) {
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    let isInvalid = false;

    for (let index = start; index < raw.length; index += 1) {
      const char = raw[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (char === "\"") {
          inString = false;
        }
        continue;
      }

      if (char === "\"") {
        inString = true;
        continue;
      }

      if (char === "{" || char === "[") {
        stack.push(char);
        continue;
      }

      if (char === "}" || char === "]") {
        const expectedOpen = char === "}" ? "{" : "[";
        const lastOpen = stack.pop();
        if (!lastOpen || lastOpen !== expectedOpen) {
          isInvalid = true;
          break;
        }

        if (stack.length === 0) {
          return raw.slice(start, index + 1);
        }
      }
    }

    if (isInvalid) {
      continue;
    }
  }

  return undefined;
}

function parseJsonResponse(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const candidates: string[] = [trimmed];
  for (const match of trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    const candidate = match[1]?.trim();
    if (candidate) candidates.push(candidate);
  }

  const extracted = extractFirstJsonChunk(trimmed);
  if (extracted) candidates.push(extracted);

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    if (parsed.ok) return parsed.value;
  }

  return {};
}

function extractStoryPackRoot(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  if (isRecord(raw.storyPack)) return raw.storyPack;
  if (isRecord(raw.data) && isRecord(raw.data.storyPack)) return raw.data.storyPack;
  return raw;
}

function buildFallbackStoryPack(spec: Partial<CreatorSpec>, draftText?: string): CreatorStoryPack {
  const merged = { ...EMPTY_CREATOR_SPEC, ...spec };
  const baseTitle = merged.title || EMPTY_CREATOR_STORY_PACK.title;
  const mood = merged.mood || "moody";
  const theme = merged.theme || "an unstable world";
  const visualStyle = merged.visualStyle || "cinematic realism";
  const audience = merged.audience || "curious players";
  const keyElements = merged.keyElements.length > 0 ? merged.keyElements.join(", ") : "subtle environmental clues";

  return {
    title: baseTitle,
    logline:
      sanitizeText(
        `In ${theme}, the player uncovers escalating truths where every choice reshapes survival and identity.`,
        CREATOR_STORY_PACK_LIMITS.logline,
      ) ?? EMPTY_CREATOR_STORY_PACK.logline,
    playerRole:
      sanitizeText(
        `You are a field operative for ${audience}, balancing intuition and risk under growing pressure.`,
        CREATOR_STORY_PACK_LIMITS.playerRole,
      ) ?? EMPTY_CREATOR_STORY_PACK.playerRole,
    openingLine:
      sanitizeText(
        `Rain needles the street as the first signal arrives, and the city stops pretending it is safe.`,
        CREATOR_STORY_PACK_LIMITS.openingLine,
      ) ??
      EMPTY_CREATOR_STORY_PACK.openingLine,
    phaseOutline: EMPTY_CREATOR_STORY_PACK.phaseOutline.map((phase) => ({
      phase: phase.phase,
      goal: phase.goal,
      tone: sanitizeText(`${phase.tone} (${mood})`, 120) ?? phase.tone,
    })),
    soundPlan: EMPTY_CREATOR_STORY_PACK.soundPlan.map((cue) => ({
      ...cue,
      reason:
        sanitizeText(`${cue.reason} Use ${visualStyle} textures around ${keyElements}.`, 220) ??
        cue.reason,
    })),
    systemPromptDraft:
      sanitizeText(
        [
          "You are an interactive narrative engine.",
          "Write in second person, maintain continuity, and avoid contradictions across scenes.",
          `Creative context: theme=${theme}; mood=${mood}; visualStyle=${visualStyle}; keyElements=${keyElements}.`,
          draftText ? `Incorporate this draft direction: ${draftText}.` : "",
          "Produce concise scene beats with escalating stakes and meaningful player choices.",
        ]
          .filter(Boolean)
          .join(" "),
        CREATOR_STORY_PACK_LIMITS.systemPromptDraft,
      ) ?? EMPTY_CREATOR_STORY_PACK.systemPromptDraft,
  };
}

function normalizePhaseOutline(input: unknown, fallback: CreatorStoryPackPhase[]): CreatorStoryPackPhase[] {
  const safeFallback = fallback.map((phase) => ({ ...phase }));
  if (!Array.isArray(input)) return safeFallback;

  const normalized = input
    .map((item, index): CreatorStoryPackPhase | null => {
      if (!isRecord(item)) return null;
      const fallbackPhase = safeFallback[index] ?? safeFallback[safeFallback.length - 1];
      if (!fallbackPhase) return null;

      return {
        phase: sanitizeText(item.phase, CREATOR_STORY_PACK_LIMITS.phaseLabel) ?? fallbackPhase.phase,
        goal: sanitizeText(item.goal, CREATOR_STORY_PACK_LIMITS.phaseGoal) ?? fallbackPhase.goal,
        tone: sanitizeText(item.tone, CREATOR_STORY_PACK_LIMITS.phaseTone) ?? fallbackPhase.tone,
      };
    })
    .filter((phase): phase is CreatorStoryPackPhase => phase !== null)
    .slice(0, 5);

  while (normalized.length < 5) {
    const fallbackPhase = safeFallback[normalized.length];
    if (!fallbackPhase) break;
    normalized.push({ ...fallbackPhase });
  }

  return normalized.slice(0, 5);
}

function normalizeSoundPlan(input: unknown, fallback: CreatorStoryPackSoundCue[]): CreatorStoryPackSoundCue[] {
  const safeFallback = fallback.map((cue) => ({ ...cue }));
  if (!Array.isArray(input)) return safeFallback;

  const usedIds = new Set<string>();
  const normalized = input
    .map((item, index): CreatorStoryPackSoundCue | null => {
      if (!isRecord(item)) return null;

      const moment = sanitizeText(item.moment, CREATOR_STORY_PACK_LIMITS.cueMoment);
      const reason = sanitizeText(item.reason, CREATOR_STORY_PACK_LIMITS.cueReason);
      if (!moment || !reason) return null;

      let id = sanitizeCueId(item.id, index);
      while (usedIds.has(id)) {
        id = `${id}-${index + 1}`;
      }
      usedIds.add(id);

      return { id, moment, reason };
    })
    .filter((cue): cue is CreatorStoryPackSoundCue => cue !== null)
    .slice(0, 8);

  return normalized.length > 0 ? normalized : safeFallback;
}

function normalizeStoryPack(raw: unknown, spec: Partial<CreatorSpec>, draftText?: string): CreatorStoryPack {
  const fallback = buildFallbackStoryPack(spec, draftText);
  const root = extractStoryPackRoot(raw);
  if (!isRecord(root)) return fallback;

  return {
    title: sanitizeText(root.title, CREATOR_STORY_PACK_LIMITS.title) ?? fallback.title,
    logline: sanitizeText(root.logline, CREATOR_STORY_PACK_LIMITS.logline) ?? fallback.logline,
    playerRole: sanitizeText(root.playerRole, CREATOR_STORY_PACK_LIMITS.playerRole) ?? fallback.playerRole,
    openingLine: sanitizeText(root.openingLine, CREATOR_STORY_PACK_LIMITS.openingLine) ?? fallback.openingLine,
    phaseOutline: normalizePhaseOutline(root.phaseOutline, fallback.phaseOutline),
    soundPlan: normalizeSoundPlan(root.soundPlan, fallback.soundPlan),
    systemPromptDraft:
      sanitizeText(root.systemPromptDraft, CREATOR_STORY_PACK_LIMITS.systemPromptDraft) ?? fallback.systemPromptDraft,
  };
}

function buildPrompt(spec: Partial<CreatorSpec>, draftText?: string): string {
  return [
    "You are a story architect that builds short, playable narrative packs.",
    "Return JSON only. Do not include markdown, code fences, comments, or prose outside JSON.",
    "Output must match exactly:",
    "{",
    '  "title": "string",',
    '  "logline": "string",',
    '  "playerRole": "string",',
    '  "openingLine": "string",',
    '  "phaseOutline": [',
    '    { "phase": "string", "goal": "string", "tone": "string" }',
    "  ],",
    '  "soundPlan": [',
    '    { "id": "string", "moment": "string", "reason": "string" }',
    "  ],",
    '  "systemPromptDraft": "string"',
    "}",
    "Rules:",
    "- phaseOutline must contain exactly 5 phases.",
    "- Each phase needs a concrete goal and distinct tone.",
    "- soundPlan should contain 3 to 6 cues with unique ids.",
    "- Keep writing production-ready and concise.",
    "",
    `Creator spec JSON: ${JSON.stringify(spec)}`,
    `Draft text: ${draftText ?? "none provided"}`,
  ].join("\n");
}

async function generateStoryPack(
  ai: GoogleGenAI,
  spec: Partial<CreatorSpec>,
  draftText?: string,
): Promise<CreatorStoryPack> {
  const response = await ai.models.generateContent({
    model: CREATOR_INTERVIEW_MODEL,
    contents: buildPrompt(spec, draftText),
    config: {
      responseMimeType: "application/json",
      temperature: 0.55,
      maxOutputTokens: 1500,
    },
  });

  const parsed = parseJsonResponse(response.text ?? "");
  return normalizeStoryPack(parsed, spec, draftText);
}

export async function POST(req: NextRequest): Promise<Response> {
  const traceId = resolveCreatorTraceId(req.headers.get(CREATOR_TRACE_HEADER), "creator-story-pack");

  const jsonWithTrace = (payload: Record<string, unknown> | CreatorStoryPackResponseBody, status: number): Response =>
    Response.json(payload, {
      status,
      headers: { [CREATOR_TRACE_HEADER]: traceId },
    });

  const logInfo = (event: string, sessionId?: string, details: Record<string, unknown> = {}): void => {
    logger.info({
      event,
      sessionId,
      causalChain: [`trace:${traceId}`, event],
      data: { traceId, ...details },
    });
  };

  const logError = (event: string, sessionId: string | undefined, error: unknown): void => {
    logger.error({
      event,
      sessionId,
      causalChain: [`trace:${traceId}`, event],
      data: { traceId },
      error,
    });
  };

  let body: CreatorStoryPackRequestBody;
  try {
    body = (await req.json()) as CreatorStoryPackRequestBody;
  } catch {
    return jsonWithTrace({ error: "Invalid JSON body" }, 400);
  }

  const sessionId = sanitizeSessionId(body.sessionId);
  const spec = sanitizeCreatorSpecPartial(body.spec);
  const draftText = sanitizeCreatorStoryDraftText(body.draftText);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonWithTrace({ error: "Missing GEMINI_API_KEY environment variable" }, 500);
  }

  logInfo("creator.story_pack.request.received", sessionId, {
    hasDraftText: Boolean(draftText),
    specKeys: Object.keys(spec).length,
  });

  let storyPack = buildFallbackStoryPack(spec, draftText);
  try {
    const ai = new GoogleGenAI({ apiKey } as ConstructorParameters<typeof GoogleGenAI>[0]);
    storyPack = await generateStoryPack(ai, spec, draftText);
  } catch (error) {
    logError("creator.story_pack.model_failed", sessionId, error);
  }

  const quality = evaluateCreatorStoryPackQuality(storyPack);
  const payload: CreatorStoryPackResponseBody = { storyPack, quality };
  return jsonWithTrace(payload, 200);
}
