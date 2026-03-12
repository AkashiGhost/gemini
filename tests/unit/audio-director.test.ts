import { describe, expect, it } from "vitest";
import { AudioDirector, type AudioDirectorEngine } from "@/lib/audio/audio-director";
import { getSoundManifest } from "@/lib/audio/sound-manifests";

function createEngineHarness() {
  const calls: Array<{ kind: string; args: unknown[] }> = [];
  const engine: AudioDirectorEngine = {
    triggerCue: (...args) => calls.push({ kind: "triggerCue", args }),
    handleToolCall: (...args) => calls.push({ kind: "handleToolCall", args }),
    fadeAllToNothing: (...args) => calls.push({ kind: "fadeAllToNothing", args }),
  };

  return { calls, engine };
}

describe("AudioDirector", () => {
  it("dispatches the authored Me and Mes threshold sequence", () => {
    const scheduled: Array<{ delayMs: number; run: () => void }> = [];
    const { calls, engine } = createEngineHarness();
    const director = new AudioDirector({
      engine,
      manifest: getSoundManifest("me-and-mes"),
      schedule: (run, delayMs) => {
        scheduled.push({ delayMs, run });
        return delayMs;
      },
    });

    expect(director.dispatch("threshold_entered")).toBe(true);
    expect(calls).toEqual([
      { kind: "triggerCue", args: ["threshold_tone", 0.18] },
      { kind: "triggerCue", args: ["door_creak", 0.24] },
    ]);

    const delays = scheduled.map((entry) => entry.delayMs);
    expect(delays).toEqual([220, 450]);

    scheduled.sort((a, b) => a.delayMs - b.delayMs).forEach((entry) => entry.run());

    expect(calls).toEqual([
      { kind: "triggerCue", args: ["threshold_tone", 0.18] },
      { kind: "triggerCue", args: ["door_creak", 0.24] },
      { kind: "triggerCue", args: ["footsteps", 0.16] },
      { kind: "handleToolCall", args: ["chamber_hum", 0.14, true, 2.8] },
    ]);
  });

  it("does not replay the same authored event twice in one session", () => {
    const { calls, engine } = createEngineHarness();
    const director = new AudioDirector({
      engine,
      manifest: getSoundManifest("me-and-mes"),
      schedule: (run) => {
        run();
        return 1;
      },
    });

    expect(director.dispatch("threshold_entered")).toBe(true);
    expect(director.dispatch("threshold_entered")).toBe(false);
    expect(calls).toHaveLength(4);
  });

  it("cancels scheduled actions on reset", () => {
    const scheduled: number[] = [];
    const cancelled: number[] = [];
    const { engine } = createEngineHarness();
    const director = new AudioDirector({
      engine,
      manifest: getSoundManifest("me-and-mes"),
      schedule: (_run, delayMs) => {
        scheduled.push(delayMs);
        return delayMs;
      },
      cancel: (handle) => {
        cancelled.push(handle as number);
      },
    });

    director.dispatch("threshold_entered");
    director.reset();

    expect(scheduled).toEqual([220, 450]);
    expect(cancelled).toEqual([220, 450]);
  });

  it("does nothing when the manifest has no actions for an event", () => {
    const { calls, engine } = createEngineHarness();
    const director = new AudioDirector({
      engine,
      manifest: getSoundManifest("the-call"),
    });

    expect(director.dispatch("ending_reached")).toBe(false);
    expect(calls).toEqual([]);
  });
});
