import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isCreatorInterviewChunk, type CreatorInterviewChunk } from "../../src/lib/config/creator";

const { mockGenerateContent, mockGenerateImages, mockGoogleGenAIConstructor } = vi.hoisted(() => {
  const generateContent = vi.fn();
  const generateImages = vi.fn();
  const googleGenAIConstructor = vi.fn();

  return {
    mockGenerateContent: generateContent,
    mockGenerateImages: generateImages,
    mockGoogleGenAIConstructor: googleGenAIConstructor,
  };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: class GoogleGenAI {
    models = {
      generateContent: mockGenerateContent,
      generateImages: mockGenerateImages,
    };

    constructor(config: unknown) {
      mockGoogleGenAIConstructor(config);
    }
  },
}));

const originalGeminiKey = process.env.GEMINI_API_KEY;

interface ParsedSseChunk {
  event: string;
  chunk: CreatorInterviewChunk;
}

function parseSseChunks(payload: string): ParsedSseChunk[] {
  const blocks = payload
    .trim()
    .split("\n\n")
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  return blocks.map((block) => {
    const lines = block.split("\n");
    const event = lines.find((line) => line.startsWith("event: "))?.slice("event: ".length);
    const data = lines.find((line) => line.startsWith("data: "))?.slice("data: ".length);

    if (!event || !data) {
      throw new Error(`Invalid SSE block: ${block}`);
    }

    return {
      event,
      chunk: JSON.parse(data) as CreatorInterviewChunk,
    };
  });
}

beforeEach(() => {
  vi.resetModules();
  mockGenerateContent.mockReset();
  mockGenerateImages.mockReset();
  mockGoogleGenAIConstructor.mockReset();
});

afterEach(() => {
  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
});

describe("POST /api/creator/interview", () => {
  it("returns 400 for invalid JSON", async () => {
    const { POST } = await import("../../src/app/api/creator/interview/route");

    const req = new Request("http://localhost/api/creator/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });

    const response = await POST(req as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "Invalid JSON body" });
  });

  it("streams SSE chunks with a valid contract shape", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        assistantMessage: "What mood should this artwork convey?",
        specUpdate: { mood: "uneasy", keyElements: ["fog", "broken lighthouse"] },
        imagePrompt: "A storm-battered lighthouse at dusk, heavy fog, cinematic contrast.",
        isComplete: true,
      }),
    });

    const { POST } = await import("../../src/app/api/creator/interview/route");
    const req = new Request("http://localhost/api/creator/interview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-123",
        messages: [{ role: "user", content: "I want dark coastal horror vibes." }],
        currentSpec: {},
      }),
    });

    const response = await POST(req as never);
    const payload = await response.text();
    const chunks = parseSseChunks(payload);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/event-stream");
    expect(chunks.map((chunk) => chunk.event)).toEqual([
      "message",
      "spec_update",
      "image_prompt",
      "complete",
    ]);

    for (const chunk of chunks) {
      expect(chunk.event).toBe(chunk.chunk.type);
      expect(isCreatorInterviewChunk(chunk.chunk)).toBe(true);
    }

    expect(chunks[0]?.chunk).toEqual({
      type: "message",
      message: "What mood should this artwork convey?",
    });
    expect(chunks[1]?.chunk).toEqual({
      type: "spec_update",
      specUpdate: { mood: "uneasy", keyElements: ["fog", "broken lighthouse"] },
    });
    expect(chunks[2]?.chunk).toEqual({
      type: "image_prompt",
      prompt: "A storm-battered lighthouse at dusk, heavy fog, cinematic contrast.",
    });
    expect(chunks[3]?.chunk).toEqual({
      type: "complete",
      complete: true,
    });

    expect(mockGoogleGenAIConstructor).toHaveBeenCalledTimes(1);
    expect(mockGoogleGenAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
