import path from "node:path";
import { describe, expect, it } from "vitest";
import { isLoadError, loadStory } from "../../src/lib/story-loader";

describe("sound + quality story configuration", () => {
  it("loads quality checks and critical sound constraints from story YAML", () => {
    const storyDir = path.resolve(process.cwd(), "stories/the-last-session");
    const schemasDir = path.resolve(process.cwd(), "schemas");
    const loaded = loadStory(storyDir, schemasDir);

    expect(isLoadError(loaded)).toBe(false);
    if (isLoadError(loaded)) return;

    expect(loaded.config.evaluation.qualityChecklist.length).toBeGreaterThan(0);

    expect(loaded.config.evaluation.qualityChecklist).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "clock-stop-is-hard",
          priority: "blocking",
        }),
      ]),
    );

    expect(loaded.config.sounds.cueMap.transitions.clockStop.fadeDurationSeconds).toBe(0);
    expect(loaded.config.sounds.mixing.ttsDucking.ambientReductionDb).toBe(-6);
  });
});
