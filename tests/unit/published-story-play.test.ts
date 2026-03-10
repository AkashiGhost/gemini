import { describe, expect, it } from "vitest";
import {
  buildPublishedStoryOnboarding,
  getPublishedStoryCharacterName,
  loadPublishedStory,
} from "../../src/lib/published-story-play";
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
  coverImage: "data:image/png;base64,cover123",
  runtimeMode: "live",
  soundStrategy: "ambient_first_live",
};

describe("published story play helpers", () => {
  it("builds onboarding text from a published story manifest", () => {
    const onboarding = buildPublishedStoryOnboarding(publishedStory);

    expect(onboarding.firstAudioLine).toBe("Stay on the line. The channel is changing.");
    expect(onboarding.scenes).toHaveLength(2);
    expect(onboarding.scenes[0]?.image).toBe("data:image/png;base64,cover123");
    expect(onboarding.scenes[1]?.image).toBe("data:image/png;base64,cover123");
    expect(onboarding.scenes[0]?.text).toContain("Night Channel");
    expect(onboarding.scenes[1]?.text).toContain("A radio voice drags you toward the water.");
  });

  it("returns the manifest character name for transcript labels", () => {
    expect(getPublishedStoryCharacterName(publishedStory)).toBe("Mara");
  });

  it("loads bundled published stories when client storage is unavailable", () => {
    const story = loadPublishedStory("published-exit-interview");

    expect(story?.title).toBe("Exit Interview");
    expect(story?.characterName).toBe("Guide");
  });
});
