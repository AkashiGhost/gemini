import { DEFAULT_STORY_ID, STORY_IDS, type StoryId } from "@/lib/constants";
import type { PublishedStoryManifest } from "@/lib/published-story";
import { loadPublishedStory } from "@/lib/published-story-play";

export interface PlayStorySelection {
  storyId: string;
  publishedStory: PublishedStoryManifest | null;
}

type PublishedStoryLoader = (storyId: string) => PublishedStoryManifest | null;

function normalizeBuiltInStoryId(storyId: string | null | undefined): StoryId {
  return STORY_IDS.includes(storyId as StoryId) ? (storyId as StoryId) : DEFAULT_STORY_ID;
}

function normalizePublishedCandidate(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!normalized || normalized === "1") return null;
  return normalized;
}

export function resolveRequestedPublishedStoryId(input: {
  storyParam?: string | null;
  publishedParam?: string | null;
}): string | null {
  const explicitPublished = normalizePublishedCandidate(input.publishedParam);
  if (explicitPublished) return explicitPublished;

  const storyCandidate = normalizePublishedCandidate(input.storyParam);
  if (!storyCandidate?.startsWith("published-")) return null;

  if (input.publishedParam === "1" || input.publishedParam == null) {
    return storyCandidate;
  }

  return null;
}

export function resolvePlayStorySelection(
  input: {
    storyParam?: string | null;
    publishedParam?: string | null;
  },
  loadStory: PublishedStoryLoader = loadPublishedStory,
): PlayStorySelection {
  const requestedPublishedId = resolveRequestedPublishedStoryId(input);
  if (requestedPublishedId) {
    const publishedStory = loadStory(requestedPublishedId);
    if (publishedStory) {
      return {
        storyId: publishedStory.id,
        publishedStory,
      };
    }
  }

  return {
    storyId: normalizeBuiltInStoryId(input.storyParam),
    publishedStory: null,
  };
}
