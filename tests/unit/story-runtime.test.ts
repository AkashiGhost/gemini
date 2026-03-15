import { describe, expect, it } from "vitest";
import { getStoryRuntimeProfile, isLiveRuntimeStory } from "../../src/lib/story-runtime";

describe("story runtime profile", () => {
  it("maps the live reference stories to ambient-first live mode", () => {
    expect(getStoryRuntimeProfile("the-call")).toEqual({
      runtimeMode: "live",
      soundStrategy: "ambient_first_live",
      audioArchitecture: "state_director_v2_candidate",
      fallbackAudioArchitecture: "hybrid_fallback_v1",
      candidateAudioArchitecture: "state_director_v2_candidate",
    });
    expect(getStoryRuntimeProfile("the-last-session")).toEqual({
      runtimeMode: "live",
      soundStrategy: "ambient_first_live",
      audioArchitecture: "hybrid_fallback_v1",
      fallbackAudioArchitecture: "hybrid_fallback_v1",
    });
  });

  it("maps the non-reference stories to scripted mode", () => {
    expect(getStoryRuntimeProfile("the-lighthouse")).toEqual({
      runtimeMode: "scripted",
      soundStrategy: "timeline_scripted",
      audioArchitecture: "authored_timeline_v1",
      fallbackAudioArchitecture: "authored_timeline_v1",
    });
    expect(getStoryRuntimeProfile("room-4b")).toEqual({
      runtimeMode: "scripted",
      soundStrategy: "timeline_scripted",
      audioArchitecture: "authored_timeline_v1",
      fallbackAudioArchitecture: "authored_timeline_v1",
    });
  });

  it("exposes a helper for live story checks", () => {
    expect(isLiveRuntimeStory("the-call")).toBe(true);
    expect(isLiveRuntimeStory("the-lighthouse")).toBe(false);
  });
});
