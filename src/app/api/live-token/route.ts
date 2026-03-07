// ─────────────────────────────────────────────
// POST /api/live-token
//
// Server-side: mints an ephemeral Gemini Live API token with the system
// prompt locked in, then returns it to the browser.
//
// The browser uses this token as its API key for the Gemini Live WebSocket
// connection directly — no WS proxy needed.
//
// Token validity: ephemeral tokens expire in ~1 hour (Gemini default).
// They are scoped to the Live API only and cannot be used for other APIs.
// ─────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { getStoryPrompt } from "@/lib/story-prompts";
import type { StoryId } from "@/lib/constants";
import { STORY_IDS } from "@/lib/constants";
import { getStoryRuntimeProfile } from "@/lib/story-runtime";
import {
  buildPublishedStoryPrompt,
  normalizePublishedStoryInput,
} from "@/lib/published-story";
import {
  LIVE_RUNTIME_CONFIG,
  LIVE_TOOL_DECLARATIONS,
} from "@/lib/config/live-tools";
import { createLogger } from "@/lib/logging";

export const runtime = "nodejs";
const logger = createLogger("api/live-token");

function hasHttpCode(message: string, code: number): boolean {
  return new RegExp(`\\b${code}\\b`).test(message);
}

function hasUpstreamStatus(message: string, status: string): boolean {
  return message.toUpperCase().includes(status.toUpperCase());
}

// POST /api/live-token
// Body: { storyId: string }
// Returns: { token: string }
export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id") ?? undefined;
  // ── Validate API key ─────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY — set it in your environment variables" },
      { status: 500 },
    );
  }

  // ── Parse and validate request body ─────────────────────────
  let storyId: string;
  let publishedStory: ReturnType<typeof normalizePublishedStoryInput> = null;
  try {
    const body = (await req.json()) as { storyId?: unknown; publishedStory?: unknown };
    storyId = typeof body.storyId === "string" ? body.storyId : "";
    publishedStory = normalizePublishedStoryInput(body.publishedStory);
    if (body.publishedStory !== undefined && !publishedStory) {
      return NextResponse.json({ error: "Invalid publishedStory payload" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (publishedStory) {
    storyId = publishedStory.id;
  } else if (!STORY_IDS.includes(storyId as StoryId)) {
    // Fall back to default story if id is unknown
    logger.warn({
      event: "live_token.unknown_story",
      sessionId,
      causalChain: ["live_token.request", "live_token.unknown_story"],
      data: { storyId },
    });
    storyId = "the-call";
  }

  // ── Get story system prompt ───────────────────────────────────
  const runtimeProfile = publishedStory
    ? { runtimeMode: publishedStory.runtimeMode, soundStrategy: publishedStory.soundStrategy }
    : getStoryRuntimeProfile(storyId);
  const systemPrompt = publishedStory
    ? buildPublishedStoryPrompt(publishedStory)
    : getStoryPrompt(storyId, {
      enableTools: LIVE_RUNTIME_CONFIG.enableTools,
      runtimeMode: runtimeProfile.runtimeMode,
    });

  // ── Mint ephemeral token via Gemini API ───────────────────────
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    } as ConstructorParameters<typeof GoogleGenAI>[0]);

    const modelCandidates = [LIVE_RUNTIME_CONFIG.modelName, ...LIVE_RUNTIME_CONFIG.fallbackModelNames];
    let token: string | undefined;
    let selectedModel: string | undefined;
    let lastMintError: unknown;

    for (const modelName of modelCandidates) {
      try {
        // Create an ephemeral token for the Live API session.
        // The system prompt is embedded in the token's live connect config
        // so it cannot be overridden or observed client-side.
        const tokenResponse = await ai.authTokens.create({
          config: {
            uses: 1, // Single-use — one session per token
            expireTime: new Date(Date.now() + LIVE_RUNTIME_CONFIG.ephemeralTokenLifetimeMs).toISOString(),
            // Lock the Live API config into the token
            liveConnectConstraints: {
              model: modelName,
              config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: LIVE_RUNTIME_CONFIG.voiceName },
                  },
                },
                systemInstruction: {
                  parts: [{ text: systemPrompt }],
                },
                ...(LIVE_RUNTIME_CONFIG.enableTools ? { tools: LIVE_TOOL_DECLARATIONS } : {}),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                inputAudioTranscription: {} as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                outputAudioTranscription: {} as any,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                sessionResumption: {} as any,
                contextWindowCompression: { slidingWindow: {} },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                enableAffectiveDialog: true as any,
                realtimeInputConfig: {
                  automaticActivityDetection: {
                    endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
                    silenceDurationMs: 1200,
                  },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } as any,
              } as Record<string, unknown>,
            },
          },
        } as Parameters<typeof ai.authTokens.create>[0]);

        token = (tokenResponse as Record<string, unknown>).name as string | undefined
          ?? (tokenResponse as Record<string, unknown>).token as string | undefined;
        if (!token) {
          throw new Error("Token provider returned empty token");
        }
        selectedModel = modelName;
        break;
      } catch (mintError) {
        lastMintError = mintError;
        logger.warn({
          event: "live_token.model_candidate_failed",
          sessionId,
          causalChain: ["live_token.request", "live_token.model_candidate_failed"],
          data: { storyId, model: modelName },
          error: mintError,
        });
      }
    }

    if (!token || !selectedModel) {
      const message = lastMintError instanceof Error ? lastMintError.message : "Unable to mint live token";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    logger.info({
      event: "live_token.minted",
      sessionId,
      causalChain: ["live_token.request", "live_token.minted"],
      data: { storyId, model: selectedModel },
    });

    return NextResponse.json({ token, model: selectedModel });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({
      event: "live_token.failed",
      sessionId,
      causalChain: ["live_token.request", "live_token.failed"],
      error: err,
      data: { storyId },
    });

    // Surface specific errors clearly for the client-side error UI
    if (hasHttpCode(message, 401) || hasUpstreamStatus(message, "UNAUTHENTICATED")) {
      return NextResponse.json(
        { error: `Unauthorized (401): API key is invalid or expired. ${message}` },
        { status: 401 },
      );
    }
    if (hasHttpCode(message, 429) || hasUpstreamStatus(message, "RESOURCE_EXHAUSTED")) {
      return NextResponse.json(
        { error: `Gemini Live token request hit rate-limit/quota (429). ${message}` },
        { status: 429 },
      );
    }
    if (hasHttpCode(message, 403) || hasUpstreamStatus(message, "PERMISSION_DENIED")) {
      return NextResponse.json(
        { error: `Permission denied (403): ${message}` },
        { status: 403 },
      );
    }
    if (hasHttpCode(message, 404) || hasUpstreamStatus(message, "NOT_FOUND")) {
      return NextResponse.json(
        { error: `Model/resource not found (404): ${message}` },
        { status: 404 },
      );
    }
    if (hasHttpCode(message, 500) || hasUpstreamStatus(message, "INTERNAL")) {
      return NextResponse.json(
        { error: `Gemini server error (500). ${message}` },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
