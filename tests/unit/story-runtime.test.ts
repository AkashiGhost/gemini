import { describe, expect, it } from "vitest";
import { getStoryRuntimeProfile, isLiveRuntimeStory } from "../../src/lib/story-runtime";

describe("story runtime profile", () => {
  it("maps the live reference stories to ambient-first live mode", () => {
    expect(getStoryRuntimeProfile("the-call")).toEqual({
      runtimeMode: "live",
      soundStrategy: "ambient_first_live",
    });
    expect(getStoryRuntimeProfile("the-last-session")).toEqual({
      runtimeMode: "live",
      soundStrategy: "ambient_first_live",
    });
  });

  it("maps the non-reference stories to scripted mode", () => {
    expect(getStoryRuntimeProfile("the-lighthouse")).toEqual({
      runtimeMode: "scripted",
      soundStrategy: "timeline_scripted",
    });
    expect(getStoryRuntimeProfile("room-4b")).toEqual({
      runtimeMode: "scripted",
      soundStrategy: "timeline_scripted",
    });
  });

  it("exposes a helper for live story checks", () => {
    expect(isLiveRuntimeStory("the-call")).toBe(true);
    expect(isLiveRuntimeStory("the-lighthouse")).toBe(false);
  });
});
