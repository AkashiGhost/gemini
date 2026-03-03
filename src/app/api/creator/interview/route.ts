import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  type CreatorChatMessage,
  type CreatorInterviewChunk,
  type CreatorInterviewRequestBody,
  type CreatorSpec,
  CREATOR_INTERVIEW_MODEL,
  EMPTY_CREATOR_SPEC,
  sanitizeCreatorChatMessages,
  sanitizeCreatorSpecPartial,
} from "@/lib/config/creator";

export const runtime = "nodejs";

interface InterviewModelOutput {
  assistantMessage: string;
  specUpdate: Partial<CreatorSpec>;
  imagePrompt?: string;
  isComplete: boolean;
}

const encoder = new TextEncoder();

function logInfo(event: string, sessionId?: string, details: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event, sessionId, ...details }));
}

function logError(event: string, sessionId: string | undefined, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ event, sessionId, error: message }));
}

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
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

function parseJsonResponse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const unwrapped = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/, "");
    return JSON.parse(unwrapped);
  }
}

function buildFallbackImagePrompt(spec: Partial<CreatorSpec>): string {
  const merged = { ...EMPTY_CREATOR_SPEC, ...spec };
  const parts = [
    merged.title || "Concept artwork",
    merged.theme && `Theme: ${merged.theme}`,
    merged.mood && `Mood: ${merged.mood}`,
    merged.visualStyle && `Style: ${merged.visualStyle}`,
    merged.keyElements.length > 0 && `Key elements: ${merged.keyElements.join(", ")}`,
  ].filter((part): part is string => Boolean(part));

  return `${parts.join(". ")}. Cinematic composition, high detail.`;
}

function buildPrompt(messages: CreatorChatMessage[], currentSpec: Partial<CreatorSpec>): string {
  const transcript = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n");
  return [
    "You are Creator Interview, a concise creative strategist.",
    "Given the conversation, ask the next best question while refining a creative brief.",
    "Always return valid JSON only with this exact shape:",
    "{",
    '  "assistantMessage": "string",',
    '  "specUpdate": {',
    '    "title": "string",',
    '    "audience": "string",',
    '    "theme": "string",',
    '    "mood": "string",',
    '    "visualStyle": "string",',
    '    "keyElements": ["string"],',
    '    "aspectRatio": "1:1 | 3:4 | 4:3 | 9:16 | 16:9",',
    '    "imagePrompt": "string",',
    '    "notes": "string"',
    "  },",
    '  "imagePrompt": "string",',
    '  "isComplete": true | false',
    "}",
    "Rules:",
    "- assistantMessage must be one short paragraph.",
    "- specUpdate should include only fields inferred from the conversation.",
    "- imagePrompt must be a polished image-generation prompt.",
    "- isComplete should be true only when enough detail exists to generate artwork confidently.",
    "",
    `Current spec JSON: ${JSON.stringify(currentSpec)}`,
    "Conversation:",
    transcript,
  ].join("\n");
}

async function generateInterviewOutput(
  ai: GoogleGenAI,
  messages: CreatorChatMessage[],
  currentSpec: Partial<CreatorSpec>,
): Promise<InterviewModelOutput> {
  const response = await ai.models.generateContent({
    model: CREATOR_INTERVIEW_MODEL,
    contents: buildPrompt(messages, currentSpec),
    config: {
      responseMimeType: "application/json",
      temperature: 0.45,
      maxOutputTokens: 900,
    },
  });

  const parsed = parseJsonResponse(response.text?.trim() ?? "");
  const asRecord = isRecord(parsed) ? parsed : {};

  const assistantMessage =
    sanitizeText(asRecord.assistantMessage, 1200) ??
    "I have a strong base. What visual style should the final artwork lean into?";

  const specUpdate = sanitizeCreatorSpecPartial(asRecord.specUpdate);
  const imagePrompt = sanitizeText(asRecord.imagePrompt, 1400) ?? sanitizeText(specUpdate.imagePrompt, 1400);
  const isComplete = asRecord.isComplete === true;

  return {
    assistantMessage,
    specUpdate,
    imagePrompt: imagePrompt ?? buildFallbackImagePrompt({ ...currentSpec, ...specUpdate }),
    isComplete,
  };
}

function toSseChunk(chunk: CreatorInterviewChunk): Uint8Array {
  return encoder.encode(`event: ${chunk.type}\ndata: ${JSON.stringify(chunk)}\n\n`);
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: CreatorInterviewRequestBody;
  try {
    body = (await req.json()) as CreatorInterviewRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sessionId = sanitizeSessionId(body.sessionId);
  const messages = sanitizeCreatorChatMessages(body.messages);
  const currentSpec = sanitizeCreatorSpecPartial(body.currentSpec);

  if (messages.length === 0) {
    return Response.json({ error: "messages must contain at least one message" }, { status: 400 });
  }

  logInfo("creator.interview.request.received", sessionId, {
    messageCount: messages.length,
  });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing GEMINI_API_KEY environment variable" }, { status: 500 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const sendChunk = (chunk: CreatorInterviewChunk): void => {
        controller.enqueue(toSseChunk(chunk));
        logInfo("creator.interview.chunk.sent", sessionId, { chunkType: chunk.type });
      };

      try {
        const ai = new GoogleGenAI({ apiKey } as ConstructorParameters<typeof GoogleGenAI>[0]);
        const output = await generateInterviewOutput(ai, messages, currentSpec);

        sendChunk({ type: "message", message: output.assistantMessage });

        if (Object.keys(output.specUpdate).length > 0) {
          sendChunk({ type: "spec_update", specUpdate: output.specUpdate });
        }

        if (output.imagePrompt) {
          sendChunk({ type: "image_prompt", prompt: output.imagePrompt });
        }

        sendChunk({ type: "complete", complete: true });

        logInfo("creator.interview.completed", sessionId, {
          isComplete: output.isComplete,
          hasSpecUpdate: Object.keys(output.specUpdate).length > 0,
          hasImagePrompt: Boolean(output.imagePrompt),
        });
      } catch (error) {
        logError("creator.interview.failed", sessionId, error);
        const message = error instanceof Error ? error.message : "Unexpected interview error";
        sendChunk({ type: "error", error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

