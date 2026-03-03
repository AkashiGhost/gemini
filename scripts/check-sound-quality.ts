/**
 * Quick CLI verification for sound + quality config integrity.
 * Run: npx tsx scripts/check-sound-quality.ts
 */

import path from "node:path";
import { isLoadError, loadStory } from "../src/lib/story-loader";

interface CheckResult {
  name: string;
  ok: boolean;
  details: string;
}

function runChecks(): CheckResult[] {
  const storyDir = path.resolve(process.cwd(), "stories/the-last-session");
  const schemasDir = path.resolve(process.cwd(), "schemas");
  const loaded = loadStory(storyDir, schemasDir);

  if (isLoadError(loaded)) {
    return [
      {
        name: "story-load",
        ok: false,
        details: loaded.errors.join("; "),
      },
    ];
  }

  const { config } = loaded;

  const results: CheckResult[] = [];

  const qualityCount = config.evaluation.qualityChecklist.length;
  results.push({
    name: "quality-checklist-loaded",
    ok: qualityCount > 0,
    details: `items=${qualityCount}`,
  });

  const hasSoundDesignCheck = config.evaluation.qualityChecklist.some(
    (item) => item.id === "clock-stop-is-hard" && item.priority === "blocking",
  );
  results.push({
    name: "sound-design-blocking-check-present",
    ok: hasSoundDesignCheck,
    details: "expected id=clock-stop-is-hard with priority=blocking",
  });

  const clockStop = config.sounds.cueMap.transitions.clockStop;
  const clockStopFade = clockStop?.fadeDurationSeconds;
  results.push({
    name: "clock-stop-hard-fade",
    ok: clockStopFade === 0,
    details: `fadeDurationSeconds=${String(clockStopFade)}`,
  });

  const ducking = config.sounds.mixing.ttsDucking;
  results.push({
    name: "tts-ducking-configured",
    ok: Number.isFinite(ducking.ambientReductionDb),
    details: `ambientReductionDb=${ducking.ambientReductionDb}, fadeInMs=${ducking.fadeInDurationMs}, fadeOutMs=${ducking.fadeOutDurationMs}`,
  });

  return results;
}

const results = runChecks();
const failed = results.filter((r) => !r.ok);

console.log("Sound + quality checks");
for (const result of results) {
  const status = result.ok ? "PASS" : "FAIL";
  console.log(`- ${status} ${result.name}: ${result.details}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} check(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${results.length} checks passed.`);
