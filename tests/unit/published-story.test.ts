import { describe, expect, it } from "vitest";
import {
  buildPublishedStoryPrompt,
  createPublishedStoryManifest,
  normalizePublishedStoryInput,
} from "../../src/lib/published-story";

describe("published story manifest", () => {
  it("creates a stable manifest from creator output", () => {
    const manifest = createPublishedStoryManifest({
      title: "Harbor of Ash",
      logline: "A caller guides you through a harbor where the tide remembers names.",
      playerRole: "You are the only voice on the line.",
      openingLine: "Do not hang up. The harbor lights just went out.",
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
    }, {
      coverImage: "data:image/png;base64,abc123",
    });

    expect(manifest.id).toMatch(/^published-harbor-of-ash-/);
    expect(manifest.runtimeMode).toBe("live");
    expect(manifest.soundStrategy).toBe("ambient_first_live");
    expect(manifest.characterName).toBe("Guide");
    expect(manifest.title).toBe("Harbor of Ash");
    expect(manifest.coverImage).toBe("data:image/png;base64,abc123");
  });

  it("infers the Me and Mes sound profile from authored sound cues", () => {
    const manifest = createPublishedStoryManifest({
      title: "Room Of Selves",
      logline: "A guide walks you from bed into a chamber of selves.",
      playerRole: "You answer plainly and listen.",
      openingLine: "Keep your eyes closed if you want to.",
      phaseOutline: [
        { phase: "Phase 1", goal: "Answer plainly", tone: "somnolent" },
      ],
      soundPlan: [
        { id: "bed-rustle", moment: "settling into bed", reason: "Starts at the edge of sleep." },
        { id: "room-close", moment: "the ending settles", reason: "Closes the chamber." },
      ],
      systemPromptDraft: "Keep the voice intimate and precise.",
    });

    expect(manifest.soundProfileId).toBe("me-and-mes");
  });

  it("normalizes published story input and trims unsafe values", () => {
    const normalized = normalizePublishedStoryInput({
      id: "  published-custom  ",
      title: "  Night Channel ",
      logline: "  A radio voice drags you toward the water. ",
      playerRole: " You are listening for what should not exist. ",
      openingLine: " Stay on the line. ",
      phaseOutline: [{ phase: "One", goal: "Listen", tone: "uneasy" }],
      soundPlan: [{ id: " cue 1 ", moment: "dock", reason: "pressure" }],
      systemPromptDraft: " Speak in short, escalating turns. ",
      characterName: " Mara ",
      coverImage: " data:image/png;base64,cover123 ",
      runtimeMode: "live",
      soundStrategy: "ambient_first_live",
      soundProfileId: " me-and-mes ",
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.id).toBe("published-custom");
    expect(normalized?.title).toBe("Night Channel");
    expect(normalized?.characterName).toBe("Mara");
    expect(normalized?.coverImage).toBe("data:image/png;base64,cover123");
    expect(normalized?.soundProfileId).toBe("me-and-mes");
    expect(normalized?.soundPlan[0]?.id).toBe("cue-1");
  });

  it("builds a live prompt from a published story manifest", () => {
    const normalized = normalizePublishedStoryInput({
      id: "published-night-channel",
      title: "Night Channel",
      logline: "A radio voice drags you toward the water.",
      playerRole: "You are the only person answering the radio.",
      openingLine: "Stay on the line. The channel is changing.",
      phaseOutline: [{ phase: "One", goal: "Listen", tone: "uneasy" }],
      soundPlan: [{ id: "fog-horn", moment: "dock", reason: "Signals danger in the harbor." }],
      systemPromptDraft: "Speak in short, escalating turns and always wait for the player.",
      characterName: "Mara",
      coverImage: "data:image/png;base64,cover123",
      runtimeMode: "live",
      soundStrategy: "ambient_first_live",
    });

    const prompt = buildPublishedStoryPrompt(normalized!);

    expect(prompt).toContain("Night Channel");
    expect(prompt).toContain("Stay on the line. The channel is changing.");
    expect(prompt).toContain("Speak in short, escalating turns");
    expect(prompt).toContain("fog-horn");
  });
});
