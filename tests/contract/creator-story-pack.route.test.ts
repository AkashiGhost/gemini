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

describe("POST /api/creator/story-pack", () => {
  it("returns 400 for invalid JSON", async () => {
    const { POST } = await import("../../src/app/api/creator/story-pack/route");

    const req = new Request("http://localhost/api/creator/story-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-trace-id": "trace-story-pack-invalid" },
      body: "not-json",
    });

    const response = await POST(req as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("x-trace-id")).toBe("trace-story-pack-invalid");
    expect(payload).toEqual({ error: "Invalid JSON body" });
  });

  it("returns a valid story-pack response shape", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "The Last Lighthouse",
        logline: "A keeper must decode storms that whisper in voices.",
        playerRole: "You are an apprentice storm-reader.",
        openingLine: "By midnight, the sea had learned your name.",
        phaseOutline: [
          { phase: "Phase 1", goal: "Arrive at the coast", tone: "Uneasy" },
          { phase: "Phase 2", goal: "Meet locals", tone: "Suspicious" },
          { phase: "Phase 3", goal: "Decode the signal", tone: "Paranoid" },
          { phase: "Phase 4", goal: "Face the storm core", tone: "Urgent" },
          { phase: "Phase 5", goal: "Choose what to save", tone: "Bittersweet" },
        ],
        soundPlan: [
          { id: "cue-1", moment: "Dock arrival", reason: "Grounds setting with low drones." },
          { id: "cue-2", moment: "Storm warning", reason: "Marks rising danger." },
        ],
        systemPromptDraft: "Run in second person and keep sensory tension high.",
      }),
    });

    const { POST } = await import("../../src/app/api/creator/story-pack/route");
    const req = new Request("http://localhost/api/creator/story-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-trace-id": "trace-story-pack-123" },
      body: JSON.stringify({
        sessionId: "session-123",
        spec: { title: "Harbor of Ash", mood: "Foreboding", theme: "Tidal memory" },
        draftText: "I want a playable atmospheric thriller.",
      }),
    });

    const response = await POST(req as never);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trace-id")).toBe("trace-story-pack-123");
    expect(payload).toHaveProperty("storyPack");
    expect(payload).toHaveProperty("quality");

    const storyPack = payload.storyPack as Record<string, unknown>;
    const quality = payload.quality as Record<string, unknown>;
    expect(typeof storyPack.title).toBe("string");
    expect(typeof storyPack.logline).toBe("string");
    expect(typeof storyPack.playerRole).toBe("string");
    expect(typeof storyPack.openingLine).toBe("string");
    expect(typeof storyPack.systemPromptDraft).toBe("string");
    expect(Array.isArray(storyPack.phaseOutline)).toBe(true);
    expect(Array.isArray(storyPack.soundPlan)).toBe(true);
    expect((storyPack.phaseOutline as unknown[]).length).toBe(5);
    expect((storyPack.soundPlan as unknown[]).length).toBeGreaterThan(0);

    for (const phase of storyPack.phaseOutline as Array<Record<string, unknown>>) {
      expect(typeof phase.phase).toBe("string");
      expect(typeof phase.goal).toBe("string");
      expect(typeof phase.tone).toBe("string");
    }

    for (const cue of storyPack.soundPlan as Array<Record<string, unknown>>) {
      expect(typeof cue.id).toBe("string");
      expect(typeof cue.moment).toBe("string");
      expect(typeof cue.reason).toBe("string");
    }

    expect(typeof quality.version).toBe("string");
    expect(typeof quality.score).toBe("number");
    expect(["pass", "warn", "fail"]).toContain(quality.verdict);
    expect(Array.isArray(quality.checks)).toBe(true);
    expect(Array.isArray(quality.improvementHints)).toBe(true);

    const checks = quality.checks as Array<Record<string, unknown>>;
    expect(checks).toHaveLength(6);
    expect(checks.map((check) => check.id)).toEqual([
      "structure",
      "escalation",
      "sensory-detail",
      "uniqueness",
      "sound-coverage",
      "slop-detection",
    ]);
    for (const check of checks) {
      expect(["pass", "warn", "fail"]).toContain(check.status);
      expect(typeof check.score).toBe("number");
      expect(typeof check.summary).toBe("string");
    }

    expect(mockGoogleGenAIConstructor).toHaveBeenCalledTimes(1);
    expect(mockGoogleGenAIConstructor).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining("Player profile context: none provided"),
        config: expect.objectContaining({
          responseMimeType: "application/json",
        }),
      }),
    );
  });

  it("threads bounded player profile context into prompt generation", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "Me and Mes",
        logline: "A guided chamber reveals the selves that reach for control first.",
        playerRole: "You enter a room shaped by your inner sequence.",
        openingLine: "Answer plainly. I am here to show you what speaks first inside you.",
        phaseOutline: [
          { phase: "Assessment", goal: "Collect signal", tone: "Precise" },
          { phase: "Manifestation", goal: "Reveal selves", tone: "Eerie" },
          { phase: "Cross-Examination", goal: "Force contradiction", tone: "Unsettling" },
          { phase: "Power Struggle", goal: "Contest authority", tone: "Charged" },
          { phase: "Integration", goal: "Choose who remains loudest", tone: "Consequential" },
        ],
        soundPlan: [
          { id: "chamber-hum", moment: "Arrival", reason: "Establish inner-space unease." },
          { id: "pulse-rise", moment: "Conflict spike", reason: "Marks emotional takeover." },
          { id: "breath-close", moment: "Grief contact", reason: "Draws the player inward." },
        ],
        systemPromptDraft: "One self speaks at a time. Keep the sequence emotionally specific.",
      }),
    });

    const { POST } = await import("../../src/app/api/creator/story-pack/route");
    const req = new Request("http://localhost/api/creator/story-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-profiled",
        spec: { title: "Me and Mes", mood: "Poetic and eerie" },
        playerProfileContext: {
          dominantEmotions: ["fear", "shame"],
          avoidedEmotions: ["grief"],
          unfinishedDecisions: ["left a city", "did not leave a relationship"],
          desiredIdentities: ["steady"],
          fearedIdentities: ["fraud"],
          candidateSelves: ["The Alarm", "The Witness"],
          hardLimits: ["family trauma"],
          roastTolerance: "low",
        },
      }),
    });

    const response = await POST(req as never);
    await response.json();

    expect(response.status).toBe(200);
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: expect.stringContaining("\"candidateSelves\":[\"The Alarm\",\"The Witness\"]"),
      }),
    );
  });

  it("extracts nested storyPack JSON from noisy fenced model output", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({
      text: [
        "Sure, here is the output you asked for:",
        "```json",
        JSON.stringify({
          storyPack: {
            title: "Sea of Static",
            logline: "A diver follows radio ghosts to a drowned city.",
            playerRole: "You are a signal diver.",
            openingLine: "The radio crackles before the tide turns.",
            phaseOutline: [
              { phase: "P1", goal: "Take the contract", tone: "Brooding" },
              { phase: "P2", goal: "Descend", tone: "Claustrophobic" },
              { phase: "P3", goal: "Track ghosts", tone: "Paranoid" },
              { phase: "P4", goal: "Confront source", tone: "Severe" },
              { phase: "P5", goal: "Surface changed", tone: "Haunting" },
            ],
            soundPlan: [{ id: "pulse-01", moment: "Descent", reason: "Amplifies pressure and isolation." }],
            systemPromptDraft: "Second person, sparse prose, escalating dread.",
          },
        }),
        "```",
        "Let me know if you need edits.",
      ].join("\n"),
    });

    const { POST } = await import("../../src/app/api/creator/story-pack/route");
    const req = new Request("http://localhost/api/creator/story-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: "session-abc", spec: { title: "Ignored if model returns title" } }),
    });

    const response = await POST(req as never);
    const payload = await response.json();
    const storyPack = payload.storyPack as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(storyPack.title).toBe("Sea of Static");
    expect((storyPack.phaseOutline as unknown[]).length).toBe(5);
    expect((storyPack.soundPlan as unknown[]).length).toBe(1);
  });

  it("normalizes missing fields and malformed arrays to safe defaults", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "Broken Compass",
        phaseOutline: [{ phase: "Only phase", goal: "", tone: "Anxious" }, "bad-item"],
        soundPlan: [{ id: "cue-1", moment: "", reason: "" }],
      }),
    });

    const { POST } = await import("../../src/app/api/creator/story-pack/route");
    const req = new Request("http://localhost/api/creator/story-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-missing-fields",
        spec: { theme: "A fractured map of memory", mood: "Noir", visualStyle: "Film grain" },
      }),
    });

    const response = await POST(req as never);
    const payload = await response.json();
    const storyPack = payload.storyPack as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(typeof storyPack.title).toBe("string");
    expect(typeof storyPack.logline).toBe("string");
    expect((storyPack.logline as string).length).toBeGreaterThan(0);
    expect((storyPack.phaseOutline as unknown[]).length).toBe(5);
    expect((storyPack.soundPlan as unknown[]).length).toBeGreaterThan(0);
  });

  it("enforces length limits and unique normalized cue ids", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const longText = "x".repeat(10_000);
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: longText,
        logline: longText,
        playerRole: longText,
        openingLine: longText,
        phaseOutline: [
          { phase: longText, goal: longText, tone: longText },
          { phase: longText, goal: longText, tone: longText },
          { phase: longText, goal: longText, tone: longText },
          { phase: longText, goal: longText, tone: longText },
          { phase: longText, goal: longText, tone: longText },
        ],
        soundPlan: [
          { id: "!!! CUE ###", moment: longText, reason: longText },
          { id: "!!! CUE ###", moment: longText, reason: longText },
        ],
        systemPromptDraft: longText,
      }),
    });

    const { POST } = await import("../../src/app/api/creator/story-pack/route");
    const req = new Request("http://localhost/api/creator/story-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-extreme",
        draftText: `${longText}\n\n${"\u0000"}\n${longText}`,
      }),
    });

    const response = await POST(req as never);
    const payload = await response.json();
    const storyPack = payload.storyPack as {
      title: string;
      logline: string;
      playerRole: string;
      openingLine: string;
      phaseOutline: Array<{ phase: string; goal: string; tone: string }>;
      soundPlan: Array<{ id: string; moment: string; reason: string }>;
      systemPromptDraft: string;
    };

    expect(response.status).toBe(200);
    expect(storyPack.title.length).toBeLessThanOrEqual(160);
    expect(storyPack.logline.length).toBeLessThanOrEqual(420);
    expect(storyPack.playerRole.length).toBeLessThanOrEqual(220);
    expect(storyPack.openingLine.length).toBeLessThanOrEqual(240);
    expect(storyPack.systemPromptDraft.length).toBeLessThanOrEqual(3200);

    for (const phase of storyPack.phaseOutline) {
      expect(phase.phase.length).toBeLessThanOrEqual(60);
      expect(phase.goal.length).toBeLessThanOrEqual(260);
      expect(phase.tone.length).toBeLessThanOrEqual(120);
    }

    for (const cue of storyPack.soundPlan) {
      expect(cue.id.length).toBeLessThanOrEqual(50);
      expect(cue.moment.length).toBeLessThanOrEqual(140);
      expect(cue.reason.length).toBeLessThanOrEqual(220);
    }

    expect(storyPack.soundPlan[0]?.id).toBe("cue");
    expect(storyPack.soundPlan[1]?.id).toBe("cue-2");
  });

  it("adds quality hints when model output contains slop and weak progression", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "Night Room",
        logline: "Something felt wrong in the room.",
        playerRole: "You are someone who is maybe involved.",
        openingLine: "It was dark and something felt wrong.",
        phaseOutline: [
          { phase: "Phase 1", goal: "Investigate the room", tone: "tense" },
          { phase: "Phase 2", goal: "Investigate the room", tone: "tense" },
          { phase: "Phase 3", goal: "Investigate the room", tone: "tense" },
          { phase: "Phase 4", goal: "Investigate the room", tone: "tense" },
          { phase: "Phase 5", goal: "Investigate the room", tone: "tense" },
        ],
        soundPlan: [{ id: "cue-1", moment: "middle", reason: "Maybe tension rises." }],
        systemPromptDraft:
          "I understand. Perhaps the air grew thick and something felt wrong. Maybe it could be unsettling.",
      }),
    });

    const { POST } = await import("../../src/app/api/creator/story-pack/route");
    const req = new Request("http://localhost/api/creator/story-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-slop-quality",
        spec: { title: "Night Room" },
      }),
    });

    const response = await POST(req as never);
    const payload = await response.json();
    const quality = payload.quality as {
      verdict: string;
      checks: Array<{ id: string; status: string }>;
      improvementHints: string[];
    };

    expect(response.status).toBe(200);
    expect(["warn", "fail"]).toContain(quality.verdict);
    expect(quality.checks.some((check) => check.id === "slop-detection" && check.status === "fail")).toBe(true);
    expect(quality.checks.some((check) => check.id === "escalation" && check.status !== "pass")).toBe(true);
    expect(quality.improvementHints.length).toBeGreaterThan(0);
  });

  it("uses the exact manual title when manual title mode is selected", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent.mockResolvedValue({
      text: JSON.stringify({
        title: "Wrong Generated Title",
        logline: "A guided chamber reveals the selves that reach for control first.",
        playerRole: "You enter a room shaped by your inner sequence.",
        openingLine: "Answer plainly. I am here to show you what speaks first inside you.",
        phaseOutline: [
          { phase: "Assessment", goal: "Collect signal", tone: "Precise" },
          { phase: "Manifestation", goal: "Reveal selves", tone: "Eerie" },
          { phase: "Cross-Examination", goal: "Force contradiction", tone: "Unsettling" },
          { phase: "Power Struggle", goal: "Contest authority", tone: "Charged" },
          { phase: "Integration", goal: "Choose who remains loudest", tone: "Consequential" },
        ],
        soundPlan: [
          { id: "chamber-hum", moment: "Arrival", reason: "Establish inner-space unease." },
          { id: "pulse-rise", moment: "Conflict spike", reason: "Marks emotional takeover." },
          { id: "breath-close", moment: "Grief contact", reason: "Draws the player inward." },
        ],
        systemPromptDraft: "One self speaks at a time. Keep the sequence emotionally specific.",
      }),
    });

    const { POST } = await import("../../src/app/api/creator/story-pack/route");
    const req = new Request("http://localhost/api/creator/story-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-manual-title",
        titleMode: "manual",
        manualTitle: "Me and Mes",
        spec: { mood: "Poetic and eerie" },
      }),
    });

    const response = await POST(req as never);
    const payload = await response.json();
    const storyPack = payload.storyPack as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(storyPack.title).toBe("Me and Mes");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });

  it("repairs placeholder hero fields with a second structured pass", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockGenerateContent
      .mockResolvedValueOnce({
        text: JSON.stringify({
          title: "Untitled Story Pack",
          logline: "A player is drawn into a world where each choice reshapes what survival means.",
          playerRole: "You are the protagonist navigating high-stakes uncertainty.",
          openingLine: "The air hums before dawn, and something in the dark already knows your name.",
          phaseOutline: [
            { phase: "Phase 1", goal: "Answer the call", tone: "urgent" },
            { phase: "Phase 2", goal: "Map the harbor", tone: "uneasy" },
            { phase: "Phase 3", goal: "Find the missing boat", tone: "paranoid" },
            { phase: "Phase 4", goal: "Choose what to trust", tone: "desperate" },
            { phase: "Phase 5", goal: "Leave or stay", tone: "haunting" },
          ],
          soundPlan: [
            { id: "fog-horn", moment: "first warning", reason: "Marks the harbor closing in." },
          ],
          systemPromptDraft: "Keep the exchange tense, playable, and voice-first.",
        }),
      })
      .mockResolvedValueOnce({
        text: JSON.stringify({
          title: "The Quiet Between Floors",
          logline: "A sleepless caller is led into a room where every emotion argues for custody.",
          playerRole: "You are the voice standing at the threshold of your own divided mind.",
          openingLine: "Before you sleep, tell me which feeling reaches for the light first.",
        }),
      });

    const { POST } = await import("../../src/app/api/creator/story-pack/route");
    const req = new Request("http://localhost/api/creator/story-pack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "session-hero-repair",
        draftText: "A surreal room of emotional selves that should feel intimate and psychologically exact.",
      }),
    });

    const response = await POST(req as never);
    const payload = await response.json();
    const storyPack = payload.storyPack as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(storyPack.title).toBe("The Quiet Between Floors");
    expect(storyPack.logline).toContain("every emotion argues for custody");
    expect(storyPack.playerRole).toContain("divided mind");
    expect(storyPack.openingLine).toContain("which feeling reaches for the light first");
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });
});
