import type { AudioArchitectureId } from "@/lib/audio/audio-architecture-registry";
import { DEFAULT_STORY_ID } from "@/lib/constants";

export type StoryRuntimeMode = "live" | "scripted";
export type SoundStrategy = "ambient_first_live" | "timeline_scripted";

export interface StoryRuntimeProfile {
  runtimeMode: StoryRuntimeMode;
  soundStrategy: SoundStrategy;
  audioArchitecture: AudioArchitectureId;
  fallbackAudioArchitecture?: AudioArchitectureId;
  candidateAudioArchitecture?: AudioArchitectureId;
}

const STORY_RUNTIME_PROFILES: Record<string, StoryRuntimeProfile> = {
  "the-call": {
    runtimeMode: "live",
    soundStrategy: "ambient_first_live",
    audioArchitecture: "state_director_v2_candidate",
    fallbackAudioArchitecture: "hybrid_fallback_v1",
    candidateAudioArchitecture: "state_director_v2_candidate",
  },
  "the-last-session": {
    runtimeMode: "live",
    soundStrategy: "ambient_first_live",
    audioArchitecture: "hybrid_fallback_v1",
    fallbackAudioArchitecture: "hybrid_fallback_v1",
  },
  "the-lighthouse": {
    runtimeMode: "scripted",
    soundStrategy: "timeline_scripted",
    audioArchitecture: "authored_timeline_v1",
    fallbackAudioArchitecture: "authored_timeline_v1",
  },
  "room-4b": {
    runtimeMode: "scripted",
    soundStrategy: "timeline_scripted",
    audioArchitecture: "authored_timeline_v1",
    fallbackAudioArchitecture: "authored_timeline_v1",
  },
  "me-and-mes": {
    runtimeMode: "live",
    soundStrategy: "ambient_first_live",
    audioArchitecture: "hybrid_fallback_v1",
    fallbackAudioArchitecture: "hybrid_fallback_v1",
  },
};

export function getStoryRuntimeProfile(storyId: string): StoryRuntimeProfile {
  return STORY_RUNTIME_PROFILES[storyId] ?? STORY_RUNTIME_PROFILES[DEFAULT_STORY_ID];
}

export function isLiveRuntimeStory(storyId: string): boolean {
  return getStoryRuntimeProfile(storyId).runtimeMode === "live";
}
