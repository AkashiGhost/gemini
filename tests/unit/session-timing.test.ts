import { describe, expect, it } from "vitest";
import {
  buildSessionTimingSummary,
  createSessionTimingState,
  markSessionTimingStage,
} from "@/context/session-timing";

describe("session timing", () => {
  it("records elapsed and delta times from the begin click anchor", () => {
    const state = createSessionTimingState({
      sessionId: "session-1",
      storyId: "the-call",
      beginClickedAtMs: 1_000,
    });

    const startResult = markSessionTimingStage(state, "start_session_enter", 1_250);
    const tokenResult = markSessionTimingStage(startResult.state, "live_token_request_end", 1_900);

    expect(startResult.firstRecorded).toBe(true);
    expect(startResult.elapsedMs).toBe(250);
    expect(startResult.deltaMs).toBe(250);

    expect(tokenResult.elapsedMs).toBe(900);
    expect(tokenResult.deltaMs).toBe(650);
  });

  it("does not overwrite the first timestamp for a stage", () => {
    const state = createSessionTimingState({
      sessionId: "session-1",
      storyId: "the-call",
      beginClickedAtMs: 5_000,
    });

    const first = markSessionTimingStage(state, "session_open", 5_400);
    const second = markSessionTimingStage(first.state, "session_open", 5_900);

    expect(second.firstRecorded).toBe(false);
    expect(second.recordedAtMs).toBe(5_400);
    expect(buildSessionTimingSummary(second.state).stages.session_open).toBe(400);
  });

  it("builds a summary with elapsed offsets from begin click", () => {
    const state = createSessionTimingState({
      sessionId: "session-2",
      storyId: "the-last-session",
      beginClickedAtMs: 10_000,
    });

    const withKickoff = markSessionTimingStage(state, "kickoff_sent", 13_250).state;
    const withFirstResponse = markSessionTimingStage(withKickoff, "first_response_received", 16_000).state;
    const summary = buildSessionTimingSummary(withFirstResponse);

    expect(summary.stageCount).toBe(3);
    expect(summary.totalElapsedMs).toBe(6_000);
    expect(summary.stages).toEqual({
      begin_clicked: 0,
      kickoff_sent: 3_250,
      first_response_received: 6_000,
    });
  });
});
