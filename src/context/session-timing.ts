export const SESSION_TIMING_STAGES = [
  "begin_clicked",
  "start_session_enter",
  "live_token_request_start",
  "live_token_request_end",
  "live_connect_start",
  "session_open",
  "kickoff_sent",
  "first_response_received",
  "first_audio_chunk_played",
  "generation_complete",
  "turn_complete",
  "first_turn_finalized",
  "first_response_delayed",
  "first_response_fallback_sent",
  "first_response_timeout",
  "session_error",
] as const;

export type SessionTimingStage = (typeof SESSION_TIMING_STAGES)[number];

export interface SessionTimingState {
  sessionId: string;
  storyId: string;
  beginClickedAtMs: number;
  stageOrder: SessionTimingStage[];
  stageTimesMs: Partial<Record<SessionTimingStage, number>>;
}

export interface SessionTimingMarkResult {
  state: SessionTimingState;
  stage: SessionTimingStage;
  firstRecorded: boolean;
  recordedAtMs: number;
  elapsedMs: number;
  deltaMs: number;
}

export interface SessionTimingSummary {
  sessionId: string;
  storyId: string;
  stageCount: number;
  totalElapsedMs: number;
  stages: Partial<Record<SessionTimingStage, number>>;
}

export function createSessionTimingState(input: {
  sessionId: string;
  storyId: string;
  beginClickedAtMs: number;
}): SessionTimingState {
  return {
    sessionId: input.sessionId,
    storyId: input.storyId,
    beginClickedAtMs: input.beginClickedAtMs,
    stageOrder: ["begin_clicked"],
    stageTimesMs: {
      begin_clicked: input.beginClickedAtMs,
    },
  };
}

export function markSessionTimingStage(
  state: SessionTimingState,
  stage: SessionTimingStage,
  recordedAtMs = Date.now(),
): SessionTimingMarkResult {
  const existing = state.stageTimesMs[stage];
  if (existing != null) {
    return {
      state,
      stage,
      firstRecorded: false,
      recordedAtMs: existing,
      elapsedMs: Math.max(0, existing - state.beginClickedAtMs),
      deltaMs: Math.max(0, existing - getPreviousRecordedAtMs(state, stage, existing)),
    };
  }

  const previousRecordedAtMs = getPreviousRecordedAtMs(state, stage, recordedAtMs);
  const nextState: SessionTimingState = {
    ...state,
    stageOrder: [...state.stageOrder, stage],
    stageTimesMs: {
      ...state.stageTimesMs,
      [stage]: recordedAtMs,
    },
  };

  return {
    state: nextState,
    stage,
    firstRecorded: true,
    recordedAtMs,
    elapsedMs: Math.max(0, recordedAtMs - state.beginClickedAtMs),
    deltaMs: Math.max(0, recordedAtMs - previousRecordedAtMs),
  };
}

export function buildSessionTimingSummary(state: SessionTimingState): SessionTimingSummary {
  const stages: Partial<Record<SessionTimingStage, number>> = {};
  for (const stage of state.stageOrder) {
    const recordedAtMs = state.stageTimesMs[stage];
    if (recordedAtMs == null) continue;
    stages[stage] = Math.max(0, recordedAtMs - state.beginClickedAtMs);
  }

  const totalElapsedMs = state.stageOrder.reduce((maxElapsedMs, stage) => {
    const elapsedMs = stages[stage] ?? 0;
    return Math.max(maxElapsedMs, elapsedMs);
  }, 0);

  return {
    sessionId: state.sessionId,
    storyId: state.storyId,
    stageCount: state.stageOrder.length,
    totalElapsedMs,
    stages,
  };
}

function getPreviousRecordedAtMs(
  state: SessionTimingState,
  stage: SessionTimingStage,
  fallbackMs: number,
): number {
  const previousStage = [...state.stageOrder].reverse().find((candidate) => candidate !== stage);
  if (!previousStage) return state.beginClickedAtMs;
  return state.stageTimesMs[previousStage] ?? fallbackMs;
}
