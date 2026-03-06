import { describe, expect, it } from "vitest";
import { getStoryPrompt } from "../../src/lib/story-prompts";

describe("getStoryPrompt", () => {
  it("omits tool-call instructions when live tools are disabled", () => {
    const prompt = getStoryPrompt("the-call", { enableTools: false });

    expect(prompt).not.toContain("TOOL CALL RULES");
    expect(prompt).not.toContain("trigger_sound");
    expect(prompt).not.toContain("set_tension");
    expect(prompt).not.toContain("end_game");
  });

  it("adds strict live opening constraints for live-mode stories", () => {
    const prompt = getStoryPrompt("the-call", {
      enableTools: false,
      runtimeMode: "live",
    });

    expect(prompt).toContain("LIVE MODE CONSTRAINTS");
    expect(prompt).toContain("first response after connection must be one short line");
  });
});
