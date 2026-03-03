import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function imageRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/creator/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  mockGenerateContent.mockReset();
  mockGenerateImages.mockReset();
  mockGoogleGenAIConstructor.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
});

describe("POST /api/creator/image rate-limit contract", () => {
  it("returns 429 and Retry-After on immediate repeated requests in same session", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({ text: "A cinematic moody observatory in rain." });
    mockGenerateImages.mockResolvedValue({
      generatedImages: [{ image: { imageBytes: "ZmFrZS1pbWFnZQ==", mimeType: "image/png" } }],
    });

    const { POST } = await import("../../src/app/api/creator/image/route");

    const first = await POST(
      imageRequest({
        sessionId: "session-a",
        prompt: "An abandoned observatory in rain.",
      }) as never,
    );
    const second = await POST(
      imageRequest({
        sessionId: "session-a",
        prompt: "An abandoned observatory in rain.",
      }) as never,
    );

    const firstPayload = await first.json();
    const secondPayload = await second.json();

    expect(first.status).toBe(200);
    expect(firstPayload).toMatchObject({
      imageBase64: "ZmFrZS1pbWFnZQ==",
      mimeType: "image/png",
      model: "imagen-3.0-generate-001",
    });

    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBe("3");
    expect(secondPayload).toEqual({
      error: "Rate limit reached for this session",
      retryAfterSeconds: 3,
    });

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateImages).toHaveBeenCalledTimes(1);
  });

  it("applies limits per session id, not globally", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({ text: "Prompt rewrite" });
    mockGenerateImages.mockResolvedValue({
      generatedImages: [{ image: { imageBytes: "AAAA", mimeType: "image/png" } }],
    });

    const { POST } = await import("../../src/app/api/creator/image/route");

    const sessionALive = await POST(
      imageRequest({ sessionId: "session-a", prompt: "A storm over cliffs." }) as never,
    );
    const sessionABlocked = await POST(
      imageRequest({ sessionId: "session-a", prompt: "A storm over cliffs." }) as never,
    );
    const sessionBAllowed = await POST(
      imageRequest({ sessionId: "session-b", prompt: "A storm over cliffs." }) as never,
    );

    expect(sessionALive.status).toBe(200);
    expect(sessionABlocked.status).toBe(429);
    expect(sessionBAllowed.status).toBe(200);

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateImages).toHaveBeenCalledTimes(2);
  });
});
