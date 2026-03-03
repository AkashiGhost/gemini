/**
 * Deterministic closed-loop scenario runner for live tool-call parsing.
 * Run: npx tsx scripts/closed-loop-scenario.ts
 */

import type { FunctionCall } from "@google/genai";
import {
  parseLiveToolCall,
  tensionToPhase,
  type LiveToolCallEvent,
  type LiveToolName,
} from "../src/lib/config/live-tools";

const FIXED_NOW_MS = Date.UTC(2026, 2, 3, 12, 0, 0);

type CaseExpectation = {
  shouldParse: boolean;
  expectedName?: LiveToolName;
  expectedCallId?: string;
  expectedSessionId?: string;
  expectedCausalChainSuffix?: string[];
  expectedArgs?: Record<string, unknown>;
  expectedPhaseOutcome?: number;
};

type ScenarioCase = {
  id: string;
  description: string;
  functionCall: FunctionCall;
  options?: {
    sessionId?: string;
    causalChain?: string[];
    nowMs?: number;
  };
  expect: CaseExpectation;
};

type Failure = {
  caseId: string;
  assertion: string;
  expected: unknown;
  actual: unknown;
};

type CaseResult = {
  assertions: number;
  failures: Failure[];
};

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function assertEqual(
  caseId: string,
  assertion: string,
  expected: unknown,
  actual: unknown,
  failures: Failure[],
): void {
  if (Object.is(expected, actual)) return;
  failures.push({ caseId, assertion, expected, actual });
}

function getArgValue(event: LiveToolCallEvent, key: string): unknown {
  return (event.args as Record<string, unknown>)[key];
}

function runCase(testCase: ScenarioCase): CaseResult {
  const failures: Failure[] = [];
  let assertions = 0;
  const parsed = parseLiveToolCall(testCase.functionCall, testCase.options);

  assertions += 1;
  assertEqual(testCase.id, "parse state", testCase.expect.shouldParse, parsed !== null, failures);

  if (!testCase.expect.shouldParse || parsed == null) {
    return { assertions, failures };
  }

  if (testCase.expect.expectedName !== undefined) {
    assertions += 1;
    assertEqual(testCase.id, "event name", testCase.expect.expectedName, parsed.name, failures);
  }

  if (testCase.expect.expectedCallId !== undefined) {
    assertions += 1;
    assertEqual(testCase.id, "call id", testCase.expect.expectedCallId, parsed.callId, failures);
  }

  if (testCase.expect.expectedSessionId !== undefined) {
    assertions += 1;
    assertEqual(testCase.id, "session id", testCase.expect.expectedSessionId, parsed.sessionId, failures);
  }

  if (testCase.expect.expectedCausalChainSuffix !== undefined) {
    const expected = testCase.expect.expectedCausalChainSuffix;
    const actual = parsed.causalChain.slice(-expected.length);
    assertions += 1;
    assertEqual(
      testCase.id,
      "causal chain suffix",
      safeJson(expected),
      safeJson(actual),
      failures,
    );
  }

  if (testCase.expect.expectedArgs !== undefined) {
    for (const [key, expectedArgValue] of Object.entries(testCase.expect.expectedArgs)) {
      assertions += 1;
      assertEqual(
        testCase.id,
        `arg.${key}`,
        expectedArgValue,
        getArgValue(parsed, key),
        failures,
      );
    }
  }

  if (testCase.expect.expectedPhaseOutcome !== undefined) {
    assertions += 1;
    const actualPhase =
      parsed.name === "set_tension"
        ? (parsed.args.phase ?? tensionToPhase(parsed.args.tension))
        : null;

    assertEqual(
      testCase.id,
      "phase outcome",
      testCase.expect.expectedPhaseOutcome,
      actualPhase,
      failures,
    );
  }

  return { assertions, failures };
}

const cases: ScenarioCase[] = [
  {
    id: "trigger-sound-snake-case",
    description: "Parses trigger_sound using snake_case args.",
    functionCall: {
      name: "trigger_sound",
      id: "tc-001",
      args: {
        sound_id: "footsteps",
        volume: 0.75,
        loop: true,
        fade_in_seconds: 1.5,
      },
    },
    options: {
      sessionId: "session-closed-loop",
      causalChain: ["scenario:closed-loop", "step:trigger"],
      nowMs: FIXED_NOW_MS,
    },
    expect: {
      shouldParse: true,
      expectedName: "trigger_sound",
      expectedCallId: "tc-001",
      expectedSessionId: "session-closed-loop",
      expectedCausalChainSuffix: ["tool:trigger_sound", "call:tc-001"],
      expectedArgs: {
        soundId: "footsteps",
        volume: 0.75,
        loop: true,
        fadeInSeconds: 1.5,
      },
    },
  },
  {
    id: "trigger-sound-camel-case",
    description: "Parses trigger_sound using camelCase args.",
    functionCall: {
      name: "trigger_sound",
      id: "tc-002",
      args: {
        soundId: "door_creak",
        fadeInSeconds: 0.4,
      },
    },
    options: {
      nowMs: FIXED_NOW_MS + 1,
    },
    expect: {
      shouldParse: true,
      expectedName: "trigger_sound",
      expectedArgs: {
        soundId: "door_creak",
        fadeInSeconds: 0.4,
      },
    },
  },
  {
    id: "set-tension-percent-derived-phase",
    description: "Normalizes percent tension and derives expected phase.",
    functionCall: {
      name: "set_tension",
      id: "tc-003",
      args: {
        tension: 65,
        transition_seconds: 2,
      },
    },
    options: {
      nowMs: FIXED_NOW_MS + 2,
    },
    expect: {
      shouldParse: true,
      expectedName: "set_tension",
      expectedArgs: {
        tension: 0.65,
        transitionSeconds: 2,
      },
      expectedPhaseOutcome: 3,
    },
  },
  {
    id: "set-tension-explicit-phase-override",
    description: "Respects explicit phase override over computed phase.",
    functionCall: {
      name: "set_tension",
      id: "tc-004",
      args: {
        tension: 0.21,
        phase: 4,
      },
    },
    options: {
      nowMs: FIXED_NOW_MS + 3,
    },
    expect: {
      shouldParse: true,
      expectedName: "set_tension",
      expectedArgs: {
        tension: 0.21,
        phase: 4,
      },
      expectedPhaseOutcome: 4,
    },
  },
  {
    id: "end-game-parses",
    description: "Parses end_game with optional args.",
    functionCall: {
      name: "end_game",
      id: "tc-005",
      args: {
        reason: "loop_complete",
        fade_out_seconds: 3,
      },
    },
    options: {
      nowMs: FIXED_NOW_MS + 4,
    },
    expect: {
      shouldParse: true,
      expectedName: "end_game",
      expectedArgs: {
        reason: "loop_complete",
        fadeOutSeconds: 3,
      },
    },
  },
  {
    id: "set-tension-missing-tension-fails",
    description: "Rejects set_tension when tension is missing.",
    functionCall: {
      name: "set_tension",
      id: "tc-006",
      args: {
        phase: 3,
      },
    },
    options: {
      nowMs: FIXED_NOW_MS + 5,
    },
    expect: {
      shouldParse: false,
    },
  },
  {
    id: "trigger-sound-missing-id-fails",
    description: "Rejects trigger_sound when sound_id/soundId is absent.",
    functionCall: {
      name: "trigger_sound",
      id: "tc-007",
      args: {
        volume: 0.5,
      },
    },
    options: {
      nowMs: FIXED_NOW_MS + 6,
    },
    expect: {
      shouldParse: false,
    },
  },
  {
    id: "unknown-tool-ignored",
    description: "Ignores unknown tool names.",
    functionCall: {
      name: "not_a_live_tool",
      id: "tc-008",
      args: {
        anything: "goes",
      },
    },
    options: {
      nowMs: FIXED_NOW_MS + 7,
    },
    expect: {
      shouldParse: false,
    },
  },
];

function main(): number {
  console.log("Closed-loop scenario runner");
  console.log("Deterministic tool-call parse + phase outcome verification");
  console.log("=".repeat(68));

  let totalAssertions = 0;
  let passedCases = 0;
  const allFailures: Failure[] = [];

  for (const testCase of cases) {
    const result = runCase(testCase);
    totalAssertions += result.assertions;

    if (result.failures.length === 0) {
      passedCases += 1;
      console.log(`[PASS] ${testCase.id} — ${testCase.description}`);
    } else {
      console.log(`[FAIL] ${testCase.id} — ${testCase.description}`);
      for (const failure of result.failures) {
        allFailures.push(failure);
        console.log(
          `  - ${failure.assertion}: expected=${safeJson(failure.expected)} actual=${safeJson(failure.actual)}`,
        );
      }
    }
  }

  const failedCases = cases.length - passedCases;
  console.log("-".repeat(68));
  console.log("Summary");
  console.log(`  Scenarios: ${cases.length}`);
  console.log(`  Assertions: ${totalAssertions}`);
  console.log(`  Passed: ${passedCases}`);
  console.log(`  Failed: ${failedCases}`);
  console.log(`  Failure details: ${allFailures.length}`);

  return failedCases === 0 ? 0 : 1;
}

const exitCode = main();
if (exitCode !== 0) {
  process.exitCode = exitCode;
}
