/**
 * Validate story YAML files load and parse correctly.
 * Run: npx tsx scripts/validate-story.ts
 */

import path from "path";
import { loadStory, isLoadError } from "../src/lib/story-loader";

const storyDir = path.resolve(__dirname, "../../stories/the-last-session");
const schemasDir = path.resolve(__dirname, "../../schemas");

console.log("Loading story from:", storyDir);
console.log("Schemas from:", schemasDir);
console.log();

const result = loadStory(storyDir, schemasDir);

if (isLoadError(result)) {
  console.error("VALIDATION FAILED:");
  for (const err of result.errors) {
    console.error("  -", err);
  }
  process.exit(1);
}

const { config, warnings } = result;

if (warnings.length > 0) {
  console.warn("Warnings:");
  for (const w of warnings) {
    console.warn("  -", w);
  }
  console.log();
}

// Summary
console.log("Story loaded successfully!");
console.log(`  Title: ${config.meta.title}`);
console.log(`  Genre: ${config.meta.genre}`);
console.log(`  Duration: ${config.meta.durationTargetMinutes} min`);
console.log(`  Phases: ${config.arc.phases.length}`);
console.log(
  `  Total beats: ${config.arc.phases.reduce((sum, p) => sum + p.beats.length, 0)}`,
);
console.log(`  Characters: ${config.characters.length}`);
console.log(`  Ending conditions: ${config.arc.endingConditions.length}`);
console.log(
  `  Choice beats: ${config.arc.phases.reduce(
    (sum, p) => sum + p.beats.filter((b) => b.type === "choice").length,
    0,
  )}`,
);

// Verify critical fields exist
const checks = [
  ["meta.id", config.meta.id],
  ["world.constraintRedirects", Object.keys(config.world.constraintRedirects).length > 0],
  ["arc.revelationLogic", Object.keys(config.arc.revelationLogic).length > 0],
  ["prompts.system.baseInstruction", !!config.prompts.system.baseInstruction],
  ["characters[0].voice.maxSentencesPerResponse", config.characters[0]?.voice.maxSentencesPerResponse],
] as const;

console.log("\nCritical field checks:");
for (const [name, value] of checks) {
  const status = value ? "OK" : "MISSING";
  console.log(`  ${status}: ${name} = ${JSON.stringify(value)}`);
}
