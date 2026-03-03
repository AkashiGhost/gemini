import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: () => null,
}));

describe("normalizeStoryPackPayload", () => {
  it("normalizes a nested storyPack payload", async () => {
    const { normalizeStoryPackPayload } = await import("./CreatorInterview");

    const normalized = normalizeStoryPackPayload({
      storyPack: {
        title: "Harbor Echo",
        logline: "A diver decodes a drowned city's warnings.",
        playerRole: "You are a salvage mapper with a dangerous memory.",
        openingLine: "By dawn, the tide had already chosen your route.",
        phaseOutline: [
          { phase: "Hook", goal: "Surface the first clue", tone: "Uneasy curiosity" },
          { phase: "Shift", goal: "Learn the city's cost", tone: "Tense" },
        ],
        soundPlan: [{ id: "cue-1", moment: "First descent", reason: "Establish pressure and scale." }],
        systemPromptDraft: "Maintain second person and keep scene continuity tight.",
      },
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.title).toBe("Harbor Echo");
    expect(normalized?.phaseOutline).toHaveLength(2);
    expect(normalized?.soundPlan[0]?.id).toBe("cue-1");
  });

  it("falls back for string list formats", async () => {
    const { normalizeStoryPackPayload } = await import("./CreatorInterview");

    const normalized = normalizeStoryPackPayload({
      logline: "Signal noir at sea.",
      phase_outline: ["Find signal", "Decode voice"],
      sound_plan: ["Dock ambience", "Storm rise"],
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.phaseOutline[0]).toEqual({
      phase: "Phase 1",
      goal: "Find signal",
      tone: "",
    });
    expect(normalized?.soundPlan[1]).toEqual({
      id: "cue-2",
      moment: "Storm rise",
      reason: "",
    });
  });
});
