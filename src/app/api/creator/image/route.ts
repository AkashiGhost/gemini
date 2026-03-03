import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  type CreatorImageRequestBody,
  type CreatorSpec,
  CREATOR_IMAGE_MODEL,
  CREATOR_IMAGE_RATE_LIMIT,
  CREATOR_INTERVIEW_MODEL,
  EMPTY_CREATOR_SPEC,
  sanitizeCreatorSpecPartial,
} from "@/lib/config/creator";

export const runtime = "nodejs";

interface SessionRateState {
  windowStartMs: number;
  count: number;
  lastRequestMs: number;
}

const sessionRateState = new Map<string, SessionRateState>();

function logInfo(event: string, sessionId?: string, details: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, sessionId, ...details }));
}

function logError(event: string, sessionId: string | undefined, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ event, sessionId, error: message }));
}

function sanitizeSessionId(input: unknown): string {
  if (typeof input !== "string") return "anonymous";
  const trimmed = input.trim();
  if (!trimmed) return "anonymous";
  return trimmed.slice(0, 120);
}

function sanitizePrompt(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 1400);
}

function toPromptFromSpec(spec: Partial<CreatorSpec>): string {
  const merged = { ...EMPTY_CREATOR_SPEC, ...spec };
  const lines = [
    merged.title || "Creator concept",
    merged.theme && `Theme: ${merged.theme}`,
    merged.audience && `Audience: ${merged.audience}`,
    merged.mood && `Mood: ${merged.mood}`,
    merged.visualStyle && `Visual style: ${merged.visualStyle}`,
    merged.keyElements.length > 0 && `Key elements: ${merged.keyElements.join(", ")}`,
    merged.notes && `Notes: ${merged.notes}`,
  ].filter((line): line is string => Boolean(line));
  return `${lines.join(". ")}. Produce a striking cinematic frame.`;
}

function pruneRateState(nowMs: number): void {
  for (const [sessionId, state] of sessionRateState.entries()) {
    if (nowMs - state.windowStartMs > CREATOR_IMAGE_RATE_LIMIT.windowMs * 2) {
      sessionRateState.delete(sessionId);
    }
  }
}

function checkRateLimit(sessionId: string): { allowed: boolean; retryAfterMs: number; remaining: number } {
  const nowMs = Date.now();
  pruneRateState(nowMs);

  const current = sessionRateState.get(sessionId);
  if (!current || nowMs - current.windowStartMs >= CREATOR_IMAGE_RATE_LIMIT.windowMs) {
    sessionRateState.set(sessionId, { windowStartMs: nowMs, count: 1, lastRequestMs: nowMs });
    return {
      allowed: true,
      retryAfterMs: 0,
      remaining: CREATOR_IMAGE_RATE_LIMIT.maxRequests - 1,
    };
  }

  if (nowMs - current.lastRequestMs < CREATOR_IMAGE_RATE_LIMIT.minIntervalMs) {
    return {
      allowed: false,
      retryAfterMs: CREATOR_IMAGE_RATE_LIMIT.minIntervalMs - (nowMs - current.lastRequestMs),
      remaining: Math.max(0, CREATOR_IMAGE_RATE_LIMIT.maxRequests - current.count),
    };
  }

  if (current.count >= CREATOR_IMAGE_RATE_LIMIT.maxRequests) {
    return {
      allowed: false,
      retryAfterMs: CREATOR_IMAGE_RATE_LIMIT.windowMs - (nowMs - current.windowStartMs),
      remaining: 0,
    };
  }

  current.count += 1;
  current.lastRequestMs = nowMs;
  sessionRateState.set(sessionId, current);
  return {
    allowed: true,
    retryAfterMs: 0,
    remaining: Math.max(0, CREATOR_IMAGE_RATE_LIMIT.maxRequests - current.count),
  };
}

async function enhancePrompt(
  ai: GoogleGenAI,
  prompt: string,
  spec: Partial<CreatorSpec>,
): Promise<string> {
  const merged = { ...EMPTY_CREATOR_SPEC, ...spec };
  const instruction = [
    "Rewrite the following image prompt into one concise, high-quality generation prompt.",
    "Keep it below 90 words, preserve intent, and include mood, framing, lighting, and texture cues.",
    "Always maintain this style direction: cinematic, dark atmosphere, moody lighting, no text, no people, environmental photography.",
    "Return plain text only with no quotes.",
    "",
    `Prompt: ${prompt}`,
    `Context title: ${merged.title}`,
    `Context visual style: ${merged.visualStyle}`,
    `Context mood: ${merged.mood}`,
    `Context key elements: ${merged.keyElements.join(", ")}`,
  ].join("\n");

  const response = await ai.models.generateContent({
    model: CREATOR_INTERVIEW_MODEL,
    contents: instruction,
    config: {
      temperature: 0.5,
      maxOutputTokens: 260,
    },
  });

  const candidate = response.text?.trim();
  const styleSuffix = "cinematic, dark atmosphere, moody lighting, no text, no people, environmental photography";
  if (!candidate) return `${prompt}. ${styleSuffix}`;
  return `${candidate.slice(0, 1200)}, ${styleSuffix}`;
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: CreatorImageRequestBody;
  try {
    body = (await req.json()) as CreatorImageRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = sanitizeSessionId(body.sessionId ?? req.headers.get("x-session-id"));
  const spec = sanitizeCreatorSpecPartial(body.spec);
  const requestedPrompt = sanitizePrompt(body.prompt);
  const basePrompt = requestedPrompt ?? sanitizePrompt(spec.imagePrompt) ?? toPromptFromSpec(spec);

  if (!basePrompt) {
    return Response.json({ error: "No prompt available for image generation" }, { status: 400 });
  }

  const limiter = checkRateLimit(sessionId);
  if (!limiter.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil(limiter.retryAfterMs / 1000));
    logInfo("creator.image.rate_limited", sessionId, { retryAfterSeconds });
    return Response.json(
      {
        error: "Rate limit reached for this session",
        retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing GEMINI_API_KEY environment variable" }, { status: 500 });
  }

  logInfo("creator.image.request.received", sessionId, {
    remainingInWindow: limiter.remaining,
  });

  try {
    const ai = new GoogleGenAI({ apiKey } as ConstructorParameters<typeof GoogleGenAI>[0]);
    const enhancedPrompt = await enhancePrompt(ai, basePrompt, spec);

    const imageResponse = await ai.models.generateImages({
      model: CREATOR_IMAGE_MODEL,
      prompt: enhancedPrompt,
      config: {
        numberOfImages: 1,
        aspectRatio: spec.aspectRatio ?? "1:1",
        outputMimeType: "image/png",
        enhancePrompt: true,
      },
    });

    const first = imageResponse.generatedImages?.[0]?.image;
    const imageBase64 = first?.imageBytes;
    const mimeType = first?.mimeType ?? "image/png";

    if (!imageBase64) {
      logInfo("creator.image.empty_response", sessionId);
      return Response.json({ error: "No image returned from model" }, { status: 502 });
    }

    logInfo("creator.image.generated", sessionId, {
      mimeType,
      promptLength: enhancedPrompt.length,
    });

    return Response.json({
      imageBase64,
      mimeType,
      prompt: enhancedPrompt,
      model: CREATOR_IMAGE_MODEL,
    });
  } catch (error) {
    logError("creator.image.failed", sessionId, error);
    const message = error instanceof Error ? error.message : "Image generation failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
