"use client";

import type { PublishedStoryManifest } from "@/lib/published-story";

export interface PublishedStoryOnboarding {
  scenes: Array<{
    image?: string;
    text: string;
  }>;
  firstAudioLine: string;
}

export const PUBLISHED_STORY_STORAGE_PREFIX = "innerplay.published-story:";

export function getPublishedStoryCharacterName(story: PublishedStoryManifest): string {
  return story.characterName || "Guide";
}

export function getPublishedStoryStorageKey(storyId: string): string {
  return `${PUBLISHED_STORY_STORAGE_PREFIX}${storyId}`;
}

export function savePublishedStory(story: PublishedStoryManifest): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getPublishedStoryStorageKey(story.id), JSON.stringify(story));
}

export function loadPublishedStory(storyId: string): PublishedStoryManifest | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(getPublishedStoryStorageKey(storyId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as PublishedStoryManifest;
  } catch {
    return null;
  }
}

export function buildPublishedStoryOnboarding(story: PublishedStoryManifest): PublishedStoryOnboarding {
  return {
    scenes: [
      {
        text: `${story.title}. ${story.playerRole}`,
      },
      {
        text: story.logline,
      },
    ],
    firstAudioLine: story.openingLine,
  };
}
