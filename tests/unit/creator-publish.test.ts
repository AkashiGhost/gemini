import { describe, expect, it } from "vitest";
import { canPublishCreatorStory, getCreatorPublishHint } from "../../src/lib/creator-publish";

describe("creator publish readiness", () => {
  it("requires both a story pack and cover image", () => {
    expect(canPublishCreatorStory({ hasStoryPack: false, hasCoverImage: false })).toBe(false);
    expect(canPublishCreatorStory({ hasStoryPack: true, hasCoverImage: false })).toBe(false);
    expect(canPublishCreatorStory({ hasStoryPack: false, hasCoverImage: true })).toBe(false);
    expect(canPublishCreatorStory({ hasStoryPack: true, hasCoverImage: true })).toBe(true);
  });

  it("explains why publish is disabled", () => {
    expect(getCreatorPublishHint({ hasStoryPack: false, hasCoverImage: false })).toBe(
      "Generate a Story Pack before publishing.",
    );
    expect(getCreatorPublishHint({ hasStoryPack: true, hasCoverImage: false })).toBe(
      "Generate an image before publishing so onboarding has artwork.",
    );
    expect(getCreatorPublishHint({ hasStoryPack: true, hasCoverImage: true })).toBe("Ready to publish.");
  });
});
