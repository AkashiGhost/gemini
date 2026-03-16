import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIVE_RUNTIME_CONFIG } from "../../src/lib/config/live-tools";

const { mockAuthTokenCreate, mockGoogleGenAIConstructor } = vi.hoisted(() => {
  const authTokenCreate = vi.fn();
  const googleGenAIConstructor = vi.fn();

  return {
    mockAuthTokenCreate: authTokenCreate,
    mockGoogleGenAIConstructor: googleGenAIConstructor,
  };
});

vi.mock("@google/genai", () => ({
  GoogleGenAI: class GoogleGenAI {
    authTokens = {
      create: mockAuthTokenCreate,
    };

    constructor(config: unknown) {
      mockGoogleGenAIConstructor(config);
    }
  },
  Modality: {
    AUDIO: "AUDIO",
  },
}));

const originalGeminiKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  vi.resetModules();
  mockAuthTokenCreate.mockReset();
  mockGoogleGenAIConstructor.mockReset();
});

afterEach(() => {
  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
});

describe("POST /api/live-token", () => {
  it("mints a token for a published story manifest", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockAuthTokenCreate.mockResolvedValue({ name: "ephemeral-token" });

    const { POST } = await import("../../src/app/api/live-token/route");
    const req = new Request("http://localhost/api/live-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-session-id": "session-published",
      },
      body: JSON.stringify({
        storyId: "published-night-channel",
        publishedStory: {
          id: "published-night-channel",
          title: "Night Channel",
          logline: "A radio voice drags you toward the water.",
          playerRole: "You are the only person answering the radio.",
          openingLine: "Stay on the line. The channel is changing.",
          phaseOutline: [{ phase: "One", goal: "Listen", tone: "uneasy" }],
          soundPlan: [{ id: "fog-horn", moment: "dock", reason: "Signals danger in the harbor." }],
          systemPromptDraft: "Speak in short, escalating turns and always wait for the player.",
          characterName: "Mara",
          runtimeMode: "live",
          soundStrategy: "ambient_first_live",
        },
      }),
    });

    const response = await POST(req as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      token: "ephemeral-token",
      model: expect.any(String),
    });
    expect(mockGoogleGenAIConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-key",
      }),
    );
    expect(mockAuthTokenCreate).toHaveBeenCalledTimes(1);
    const call = mockAuthTokenCreate.mock.calls[0]?.[0] as Record<string, unknown>;
    const text = (((call.config as Record<string, unknown>).liveConnectConstraints as Record<string, unknown>).config as Record<string, unknown>).systemInstruction as {
      parts: Array<{ text: string }>;
    };
    const realtimeInputConfig = (((call.config as Record<string, unknown>).liveConnectConstraints as Record<string, unknown>).config as Record<string, unknown>).realtimeInputConfig as {
      automaticActivityDetection?: {
        endOfSpeechSensitivity?: string;
        silenceDurationMs?: number;
      };
    };
    expect(text.parts[0]?.text).toContain("Night Channel");
    expect(text.parts[0]?.text).toContain("Stay on the line. The channel is changing.");
    expect(text.parts[0]?.text).toContain("Speak in short, escalating turns");
    expect(realtimeInputConfig.automaticActivityDetection).toEqual({
      endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
      silenceDurationMs: LIVE_RUNTIME_CONFIG.realtimeInputSilenceDurationMs,
    });
  });
});
