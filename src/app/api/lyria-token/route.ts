import { NextResponse } from "next/server";
import { GoogleGenAI, Modality } from "@google/genai";
import { LYRIA_DEFAULT_CONFIG } from "@/lib/config/lyria";
import { createLogger } from "@/lib/logging";

export const runtime = "nodejs";
const logger = createLogger("api/lyria-token");

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY in server environment" },
      { status: 500 },
    );
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      apiVersion: "v1alpha",
    } as ConstructorParameters<typeof GoogleGenAI>[0]);

    const tokenResponse = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model: LYRIA_DEFAULT_CONFIG.model,
          config: {
            responseModalities: [Modality.AUDIO],
          },
        },
      },
    } as Parameters<typeof ai.authTokens.create>[0]);

    const token = (tokenResponse as Record<string, unknown>).name as string | undefined
      ?? (tokenResponse as Record<string, unknown>).token as string | undefined;
    if (!token) {
      logger.error({
        event: "token_missing_in_response",
        causalChain: ["lyria_token.request", "lyria_token.invalid_response"],
        data: { model: LYRIA_DEFAULT_CONFIG.model },
      });
      return NextResponse.json(
        { error: "Token provider returned an unexpected response shape" },
        { status: 502 },
      );
    }

    logger.info({
      event: "ephemeral_token_minted",
      causalChain: ["lyria_token.request", "lyria_token.minted"],
      data: { model: LYRIA_DEFAULT_CONFIG.model },
    });

    return NextResponse.json({ token });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const status = mapTokenErrorToStatus(message);

    logger.error({
      event: "token_mint_failed",
      causalChain: ["lyria_token.request", "lyria_token.failed"],
      data: { status },
      error: message,
    });

    return NextResponse.json({ error: message }, { status });
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Failed to mint Lyria ephemeral token";
}

function mapTokenErrorToStatus(message: string): number {
  const normalized = message.toLowerCase();
  if (normalized.includes("401") || normalized.includes("unauthenticated")) return 401;
  if (normalized.includes("403") || normalized.includes("permission")) return 403;
  if (normalized.includes("429") || normalized.includes("quota")) return 429;
  if (normalized.includes("400") || normalized.includes("invalid argument")) return 400;
  if (normalized.includes("500") || normalized.includes("internal")) return 502;
  return 500;
}
