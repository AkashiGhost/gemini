import { DEFAULT_STORY_ID } from "@/lib/constants";

export type SoundProfileId =
  | "the-call"
  | "the-last-session"
  | "the-lighthouse"
  | "room-4b"
  | "me-and-mes";

function normalizeTitle(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveSoundProfileId(input: {
  storyId: string;
  publishedStoryTitle?: string;
  publishedStorySoundProfileId?: string;
}): SoundProfileId {
  const { storyId, publishedStoryTitle, publishedStorySoundProfileId } = input;

  switch (publishedStorySoundProfileId) {
    case "the-call":
    case "the-last-session":
    case "the-lighthouse":
    case "room-4b":
    case "me-and-mes":
      return publishedStorySoundProfileId;
    default:
      break;
  }

  switch (storyId) {
    case "the-call":
    case "the-last-session":
    case "the-lighthouse":
    case "room-4b":
      return storyId;
    case "published-me-and-mes":
      return "me-and-mes";
    default:
      break;
  }

  if (normalizeTitle(publishedStoryTitle) === "me-and-mes") {
    return "me-and-mes";
  }

  return DEFAULT_STORY_ID as SoundProfileId;
}
