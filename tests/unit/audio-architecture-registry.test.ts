import { describe, expect, it } from "vitest";
import {
  getAudioArchitectureDescriptor,
  listAudioArchitectureDescriptors,
} from "../../src/lib/audio/audio-architecture-registry";

describe("audio architecture registry", () => {
  it("returns the active hybrid runtime descriptor", () => {
    expect(getAudioArchitectureDescriptor("hybrid_fallback_v1")).toMatchObject({
      id: "hybrid_fallback_v1",
      status: "active",
      scope: "Current live-story runtime, including the-call",
    });
  });

  it("includes the-call state-director experiment as a candidate", () => {
    const ids = listAudioArchitectureDescriptors().map((item) => item.id);
    expect(ids).toContain("state_director_v2_candidate");
  });

  it("includes the proposed belief-scene reconciler architecture", () => {
    expect(getAudioArchitectureDescriptor("belief_scene_reconciler_v3")).toMatchObject({
      id: "belief_scene_reconciler_v3",
      status: "proposed",
    });
    expect(
      getAudioArchitectureDescriptor("belief_scene_reconciler_v3").researchBasis,
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("PRISM-WM"),
        expect.stringContaining("Tru-POMDP"),
        expect.stringContaining("PoE-World"),
      ]),
    );
  });

  it("includes the v4 cast scene graph architecture with proof gates", () => {
    expect(getAudioArchitectureDescriptor("clocked_cast_scene_graph_v4")).toMatchObject({
      id: "clocked_cast_scene_graph_v4",
      status: "proposed",
    });
    expect(
      getAudioArchitectureDescriptor("clocked_cast_scene_graph_v4").proofGates,
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Do not promote"),
      ]),
    );
    expect(
      getAudioArchitectureDescriptor("clocked_cast_scene_graph_v4").currentKnownBlockers,
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("one prebuilt voice config per token"),
        expect.stringContaining("one Live session path"),
      ]),
    );
  });

  it("includes the practical foreground-live hybrid cast architecture", () => {
    expect(getAudioArchitectureDescriptor("foreground_live_hybrid_cast_v4")).toMatchObject({
      id: "foreground_live_hybrid_cast_v4",
      status: "candidate",
    });
    expect(
      getAudioArchitectureDescriptor("foreground_live_hybrid_cast_v4").strengths,
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("one live token"),
        expect.stringContaining("one protected foreground voice"),
      ]),
    );
    expect(
      getAudioArchitectureDescriptor("foreground_live_hybrid_cast_v4").proofGates,
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("cast metadata"),
        expect.stringContaining("floor-aware interruption"),
      ]),
    );
  });
});
