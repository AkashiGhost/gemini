/**
 * Deterministic verifier for the-call audio routing.
 * Run: npx tsx scripts/verify-the-call-audio.ts
 */

import {
  TheCallStateDirector,
  type TheCallAudioAction,
  type TheCallAudioDirectorEngine,
  type TheCallAudioState,
} from "../src/lib/audio/the-call-state-director";
import { getSoundAssetIds } from "../src/lib/audio/sound-assets";

type EngineCall = {
  method: "triggerCue" | "handleToolCall" | "setVolume" | "stop";
  args: unknown[];
};

type ScenarioStep =
  | { kind: "user"; seq: number; text: string }
  | { kind: "ai"; text: string };

type ExpectedPartialState = Partial<TheCallAudioState>;

type Scenario = {
  id: string;
  description: string;
  steps: ScenarioStep[];
  expectedActionTypes: string[];
  expectedCalls: EngineCall[];
  expectedState: ExpectedPartialState;
};

type Failure = {
  scenarioId: string;
  assertion: string;
  expected: unknown;
  actual: unknown;
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function createEngineSpy() {
  const calls: EngineCall[] = [];
  const engine: TheCallAudioDirectorEngine = {
    triggerCue(soundId, volume) {
      calls.push({ method: "triggerCue", args: [soundId, volume] });
    },
    handleToolCall(soundId, volume, loop, fadeInSeconds) {
      calls.push({ method: "handleToolCall", args: [soundId, volume, loop, fadeInSeconds] });
    },
    setVolume(soundId, targetVolume, fadeDurationSeconds) {
      calls.push({ method: "setVolume", args: [soundId, targetVolume, fadeDurationSeconds] });
    },
    stop(soundId, fadeDurationSeconds) {
      calls.push({ method: "stop", args: [soundId, fadeDurationSeconds] });
    },
  };

  return { engine, calls };
}

function flattenActionTypes(actions: TheCallAudioAction[]): string[] {
  return actions.map((action) => action.type);
}

function flattenScenarioActionTypes(actionGroups: TheCallAudioAction[][]): string[] {
  return actionGroups.flatMap(flattenActionTypes);
}

function extractReferencedSoundIds(calls: EngineCall[]): string[] {
  return calls
    .map((call) => call.args[0])
    .filter((value): value is string => typeof value === "string");
}

function assertEqual(
  failures: Failure[],
  scenarioId: string,
  assertion: string,
  expected: unknown,
  actual: unknown,
): void {
  if (Object.is(expected, actual)) return;
  failures.push({ scenarioId, assertion, expected, actual });
}

function assertStateSubset(
  failures: Failure[],
  scenarioId: string,
  expectedState: ExpectedPartialState,
  actualState: TheCallAudioState,
): void {
  for (const [key, expectedValue] of Object.entries(expectedState)) {
    const actualValue = actualState[key as keyof TheCallAudioState];
    assertEqual(failures, scenarioId, `state.${key}`, expectedValue, actualValue);
  }
}

function verifyAuthoredAssets(
  failures: Failure[],
  scenarioId: string,
  calls: EngineCall[],
  authoredAssetIds: Set<string>,
): void {
  for (const soundId of extractReferencedSoundIds(calls)) {
    assertEqual(failures, scenarioId, `authoredAsset.${soundId}`, true, authoredAssetIds.has(soundId));
  }
}

function printTrace(
  scenario: Scenario,
  actionGroups: TheCallAudioAction[][],
  calls: EngineCall[],
): void {
  console.log(`\n[scenario:${scenario.id}] ${scenario.description}`);
  for (const step of scenario.steps) {
    if (step.kind === "user") {
      console.log(`  user[${step.seq}] -> ${step.text}`);
    } else {
      console.log(`  ai -> ${step.text}`);
    }
  }

  for (const action of actionGroups.flat()) {
    console.log(
      `  action -> ${action.type} | location=${action.state.location} | water=${action.state.waterLevel} | tension=${action.state.tensionLevel} | focus=${action.state.interactionFocus} | sound=${action.soundId ?? "none"}`,
    );
  }

  for (const call of calls) {
    const [soundId] = call.args;
    console.log(`  engine -> ${call.method}(${safeJson(soundId)})`);
  }
}

function runScenario(scenario: Scenario, authoredAssetIds: Set<string>): Failure[] {
  const failures: Failure[] = [];
  const { engine, calls } = createEngineSpy();
  const director = new TheCallStateDirector(engine);
  const actionGroups: TheCallAudioAction[][] = [];

  for (const step of scenario.steps) {
    if (step.kind === "user") {
      actionGroups.push(director.applyUserInstruction(step.seq, step.text));
    } else {
      actionGroups.push(director.applyAiNarration(step.text));
    }
  }

  const actualActionTypes = flattenScenarioActionTypes(actionGroups);
  assertEqual(
    failures,
    scenario.id,
    "actionTypes",
    safeJson(scenario.expectedActionTypes),
    safeJson(actualActionTypes),
  );
  assertEqual(
    failures,
    scenario.id,
    "engineCalls",
    safeJson(scenario.expectedCalls),
    safeJson(calls),
  );
  assertStateSubset(failures, scenario.id, scenario.expectedState, director.getState());
  verifyAuthoredAssets(failures, scenario.id, calls, authoredAssetIds);

  printTrace(scenario, actionGroups, calls);
  return failures;
}

const scenarios: Scenario[] = [
  {
    id: "movement-slow",
    description: "Slow movement uses the authored footsteps cue.",
    steps: [{ kind: "user", seq: 1, text: "Go left toward the heavy door." }],
    expectedActionTypes: ["movement_slow"],
    expectedCalls: [{ method: "triggerCue", args: ["footsteps", 0.78] }],
    expectedState: {
      interactionFocus: "movement",
      location: "starting_room",
    },
  },
  {
    id: "movement-fast",
    description: "Urgent movement uses the authored fast footsteps cue.",
    steps: [{ kind: "user", seq: 1, text: "Run down the corridor now." }],
    expectedActionTypes: ["movement_fast"],
    expectedCalls: [{ method: "triggerCue", args: ["footsteps_fast", 0.86] }],
    expectedState: {
      interactionFocus: "movement",
    },
  },
  {
    id: "movement-followthrough",
    description: "Alex's narrated movement triggers a second footsteps cue on the actual move turn.",
    steps: [
      { kind: "user", seq: 1, text: "Take the stairs on the right." },
      { kind: "ai", text: "Okay. I'm moving carefully down the stairs now." },
    ],
    expectedActionTypes: ["movement_slow", "location_right_path", "movement_followthrough_slow"],
    expectedCalls: [
      { method: "triggerCue", args: ["footsteps", 0.78] },
      { method: "handleToolCall", args: ["sub_bass", 0.12, true, 3.5] },
      { method: "setVolume", args: ["call_bed", 0.1, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.12, 2] },
      { method: "setVolume", args: ["sub_bass", 0.12, 2] },
      { method: "triggerCue", args: ["footsteps", 0.78] },
    ],
    expectedState: {
      interactionFocus: "movement",
      location: "right_path",
    },
  },
  {
    id: "panel-success",
    description: "Panel attempt plus successful narration resolves to confirm audio.",
    steps: [
      { kind: "user", seq: 1, text: "Work the panel." },
      { kind: "ai", text: "The panel worked. There's a green light now. I think it's unlocked." },
    ],
    expectedActionTypes: ["panel_attempt", "location_starting_room", "keypad_confirm"],
    expectedCalls: [
      { method: "triggerCue", args: ["keypad_beep", undefined] },
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "triggerCue", args: ["keypad_confirm", undefined] },
    ],
    expectedState: {
      interactionFocus: "panel",
      keypadState: "accepted",
      location: "starting_room",
    },
  },
  {
    id: "keypad-failure",
    description: "Keypad attempt plus failure narration resolves to invalid audio.",
    steps: [
      { kind: "user", seq: 1, text: "Try the keypad first." },
      { kind: "ai", text: "The keypad is still dark. It doesn't work." },
    ],
    expectedActionTypes: ["keypad_attempt", "location_starting_room", "keypad_invalid"],
    expectedCalls: [
      { method: "triggerCue", args: ["keypad_beep", undefined] },
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "triggerCue", args: ["keypad_invalid", undefined] },
    ],
    expectedState: {
      interactionFocus: "keypad",
      keypadState: "invalid",
      location: "starting_room",
    },
  },
  {
    id: "door-interactions",
    description: "Cautious and forced door interactions map to different authored cues.",
    steps: [
      { kind: "user", seq: 1, text: "Try the door." },
      { kind: "user", seq: 2, text: "Force the door." },
    ],
    expectedActionTypes: ["door_attempt", "door_slam"],
    expectedCalls: [
      { method: "triggerCue", args: ["door_creak", undefined] },
      { method: "triggerCue", args: ["door_slam", undefined] },
    ],
    expectedState: {
      interactionFocus: "door",
    },
  },
  {
    id: "water-probe-escalation",
    description: "Water probe and narration escalate from one-shot drip to persistent loops.",
    steps: [
      { kind: "user", seq: 1, text: "Listen for water near the drain." },
      { kind: "ai", text: "I can hear water dripping somewhere below me." },
      { kind: "ai", text: "The sound of water is getting louder now and I can feel it on my feet." },
    ],
    expectedActionTypes: [
      "water_probe",
      "location_starting_room",
      "water_level_1",
      "water_level_2",
    ],
    expectedCalls: [
      { method: "triggerCue", args: ["water_drip", undefined] },
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "handleToolCall", args: ["water_leak_loop", 0.12, true, 2.5] },
      { method: "triggerCue", args: ["water_drip", undefined] },
      { method: "setVolume", args: ["water_leak_loop", 0.16, 2] },
      { method: "handleToolCall", args: ["water_rising_loop", 0.16, true, 3] },
      { method: "handleToolCall", args: ["water_slosh_loop", 0.12, true, 2.5] },
      { method: "triggerCue", args: ["water_drip", undefined] },
    ],
    expectedState: {
      interactionFocus: "water",
      waterLevel: 2,
      location: "starting_room",
    },
  },
  {
    id: "tension-and-gas",
    description: "Threat narration escalates tension without replaying breathing SFX.",
    steps: [
      { kind: "ai", text: "I'm trapped and I can feel myself shaking. Please don't hang up." },
      { kind: "ai", text: "Wait. There's a smell. I can't breathe." },
    ],
    expectedActionTypes: ["location_starting_room", "tension_peak", "gas_release"],
    expectedCalls: [
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
    ],
    expectedState: {
      tensionLevel: 3,
      location: "starting_room",
    },
  },
  {
    id: "loop-reset",
    description: "Loop reset stops flood layers and restores the starting-room mix.",
    steps: [
      { kind: "ai", text: "I'm in the mechanical room by the heavy door. The water is rising and sloshing around my feet." },
      { kind: "ai", text: "Hello? Is... is someone there? I just woke up in this room. I found this phone." },
    ],
    expectedActionTypes: [
      "location_left_path",
      "water_level_3",
      "loop_reset",
      "location_starting_room",
    ],
    expectedCalls: [
      { method: "handleToolCall", args: ["sub_bass", 0.16, true, 3.5] },
      { method: "handleToolCall", args: ["water_slosh_loop", 0.1, true, 2.5] },
      { method: "setVolume", args: ["call_bed", 0.08, 1.5] },
      { method: "setVolume", args: ["room_ambience", 0.16, 1.5] },
      { method: "setVolume", args: ["electrical_hum", 0.06, 1.5] },
      { method: "setVolume", args: ["sub_bass", 0.16, 1.5] },
      { method: "setVolume", args: ["water_slosh_loop", 0.1, 1.5] },
      { method: "handleToolCall", args: ["water_leak_loop", 0.12, true, 2.5] },
      { method: "handleToolCall", args: ["water_rising_loop", 0.16, true, 3] },
      { method: "setVolume", args: ["water_leak_loop", 0.2, 1.5] },
      { method: "setVolume", args: ["water_rising_loop", 0.24, 1.5] },
      { method: "setVolume", args: ["water_slosh_loop", 0.16, 1.5] },
      { method: "triggerCue", args: ["water_drip", undefined] },
      { method: "stop", args: ["water_slosh_loop", 0.8] },
      { method: "stop", args: ["water_rising_loop", 0.8] },
      { method: "stop", args: ["water_leak_loop", 0.8] },
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "setVolume", args: ["sub_bass", 0.08, 3] },
    ],
    expectedState: {
      location: "starting_room",
      waterLevel: 0,
      tensionLevel: 0,
      keypadState: "unknown",
    },
  },
  {
    id: "disconnect",
    description: "Dead-line narration maps to the authored disconnect tone.",
    steps: [{ kind: "ai", text: "Wait. The line just went dead. I can't hear anything now." }],
    expectedActionTypes: ["location_starting_room", "disconnect"],
    expectedCalls: [
      { method: "setVolume", args: ["call_bed", 0.16, 2] },
      { method: "setVolume", args: ["room_ambience", 0.18, 2] },
      { method: "setVolume", args: ["electrical_hum", 0.08, 2] },
      { method: "triggerCue", args: ["disconnect_tone", undefined] },
    ],
    expectedState: {
      location: "starting_room",
    },
  },
];

function main(): number {
  const authoredAssetIds = getSoundAssetIds("the-call");
  const failures = scenarios.flatMap((scenario) => runScenario(scenario, authoredAssetIds));

  if (failures.length > 0) {
    console.error("\nThe-call audio verification failed.");
    for (const failure of failures) {
      console.error(
        `  [${failure.scenarioId}] ${failure.assertion}\n    expected: ${safeJson(failure.expected)}\n    actual:   ${safeJson(failure.actual)}`,
      );
    }
    return 1;
  }

  console.log(`\nThe-call audio verification passed (${scenarios.length} scenarios).`);
  return 0;
}

process.exit(main());
