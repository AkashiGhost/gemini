// ─────────────────────────────────────────────
// Shared constants — safe for both server and client code
// No Node.js module dependencies (no `path`, `fs`, etc.)
// ─────────────────────────────────────────────

/** Valid story IDs — must match directory names under stories/ */
export const STORY_IDS = ["the-last-session", "the-lighthouse", "room-4b", "the-call"] as const;
export type StoryId = (typeof STORY_IDS)[number];

/** Default story used when no storyId is specified */
export const DEFAULT_STORY_ID: StoryId = "the-call";
