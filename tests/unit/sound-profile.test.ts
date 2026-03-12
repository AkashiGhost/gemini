import { describe, expect, it } from "vitest";
import { resolveSoundProfileId } from "@/lib/sound-profile";
import { DEFAULT_STORY_ID } from "@/lib/constants";

describe("resolveSoundProfileId", () => {
  it("keeps built-in story ids unchanged", () => {
    expect(resolveSoundProfileId({ storyId: "the-call" })).toBe("the-call");
    expect(resolveSoundProfileId({ storyId: "room-4b" })).toBe("room-4b");
  });

  it("maps the bundled published Me and Mes story id to the dedicated sound profile", () => {
    expect(resolveSoundProfileId({ storyId: "published-me-and-mes" })).toBe("me-and-mes");
  });

  it("maps creator-generated Me and Mes stories by title", () => {
    expect(
      resolveSoundProfileId({
        storyId: "published-me-and-mes-mmkkjvdd",
        publishedStoryTitle: "Me and Mes",
      }),
    ).toBe("me-and-mes");
  });

  it("prefers explicit published story metadata over title matching", () => {
    expect(
      resolveSoundProfileId({
        storyId: "published-mystery-story-123",
        publishedStoryTitle: "Unknown Story",
        publishedStorySoundProfileId: "me-and-mes",
      }),
    ).toBe("me-and-mes");
  });

  it("falls back to the default built-in profile for unknown published stories", () => {
    expect(
      resolveSoundProfileId({
        storyId: "published-mystery-story-123",
        publishedStoryTitle: "Unknown Story",
      }),
    ).toBe(DEFAULT_STORY_ID);
  });
});
