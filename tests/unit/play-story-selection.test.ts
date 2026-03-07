import { describe, expect, it, vi } from "vitest";
import type { PublishedStoryManifest } from "../../src/lib/published-story";

const publishedStory: PublishedStoryManifest = {
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
};

describe("resolvePlayStorySelection", () => {
  it("prefers a published story loaded from client storage", async () => {
    const { resolvePlayStorySelection } = await import("../../src/lib/play-story-selection");
    const loader = vi.fn(() => publishedStory);

    const selection = resolvePlayStorySelection(
      { storyParam: "the-call", publishedParam: "published-night-channel" },
      loader,
    );

    expect(loader).toHaveBeenCalledWith("published-night-channel");
    expect(selection).toEqual({
      storyId: "published-night-channel",
      publishedStory,
    });
  });

  it("falls back to a built-in story when the published draft is missing", async () => {
    const { resolvePlayStorySelection } = await import("../../src/lib/play-story-selection");

    const selection = resolvePlayStorySelection(
      { storyParam: "the-last-session", publishedParam: "published-missing" },
      () => null,
    );

    expect(selection).toEqual({
      storyId: "the-last-session",
      publishedStory: null,
    });
  });

  it("falls back to the default story for invalid query params", async () => {
    const { resolvePlayStorySelection } = await import("../../src/lib/play-story-selection");

    const selection = resolvePlayStorySelection(
      { storyParam: "not-a-story", publishedParam: null },
      () => null,
    );

    expect(selection).toEqual({
      storyId: "the-call",
      publishedStory: null,
    });
  });
});
