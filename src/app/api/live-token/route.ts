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
import {
  LIVE_RUNTIME_CONFIG,
  LIVE_TOOL_DECLARATIONS,
} from "@/lib/config/live-tools";
import { createLogger } from "@/lib/logging";

export const runtime = "nodejs";
const logger = createLogger("api/live-token");

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
  try {
    const body = (await req.json()) as { storyId?: unknown };
    storyId = typeof body.storyId === "string" ? body.storyId : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Fall back to default story if id is unknown
  if (!STORY_IDS.includes(storyId as StoryId)) {
    logger.warn({
      event: "live_token.unknown_story",
      sessionId,
      causalChain: ["live_token.request", "live_token.unknown_story"],
      data: { storyId },
    });
    storyId = "the-call";
  }

  // ── Get story system prompt ───────────────────────────────────
  const systemPrompt = getStoryPrompt(storyId);

  // ── Mint ephemeral token via Gemini API ───────────────────────
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "v1alpha" },
    } as ConstructorParameters<typeof GoogleGenAI>[0]);

    // Create an ephemeral token for the Live API session.
    // The system prompt is embedded in the token's live connect config
    // so it cannot be overridden or observed client-side.
    const tokenResponse = await ai.authTokens.create({
      config: {
        uses: 1, // Single-use — one session per token
        expireTime: new Date(Date.now() + LIVE_RUNTIME_CONFIG.ephemeralTokenLifetimeMs).toISOString(),
        // Lock the Live API config into the token
        liveConnectConstraints: {
          model: LIVE_RUNTIME_CONFIG.modelName,
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
            tools: LIVE_TOOL_DECLARATIONS,
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

    const token = (tokenResponse as Record<string, unknown>).name as string | undefined
      ?? (tokenResponse as Record<string, unknown>).token as string | undefined;

    if (!token) {
      logger.error({
        event: "live_token.invalid_response",
        sessionId,
        causalChain: ["live_token.request", "live_token.invalid_response"],
        data: { storyId },
      });
      return NextResponse.json(
        { error: "Gemini returned an unexpected token response — check API version" },
        { status: 502 },
      );
    }

    logger.info({
      event: "live_token.minted",
      sessionId,
      causalChain: ["live_token.request", "live_token.minted"],
      data: { storyId, model: LIVE_RUNTIME_CONFIG.modelName },
    });

    return NextResponse.json({ token });
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
    if (message.includes("401") || message.includes("UNAUTHENTICATED")) {
      return NextResponse.json(
        { error: `Unauthorized (401): API key is invalid or expired. ${message}` },
        { status: 401 },
      );
    }
    if (message.includes("quota") || message.includes("429")) {
      return NextResponse.json(
        { error: `Quota exceeded. ${message}` },
        { status: 429 },
      );
    }
    if (message.includes("500") || message.includes("INTERNAL")) {
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
