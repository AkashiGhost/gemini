import { describe, expect, it } from "vitest";
import { getSoundManifest } from "@/lib/audio/sound-manifests";

describe("getSoundManifest", () => {
  it("loads the authored Me and Mes manifest", () => {
    const manifest = getSoundManifest("me-and-mes");

    expect(manifest.profileId).toBe("me-and-mes");
    expect(manifest.timeline).toHaveLength(3);
    expect(manifest.defaultVolumes.threshold_tone).toBe(0.18);
    expect(manifest.spatialMap.door_creak?.pan).toBe(-0.16);
  });

  it("falls back to the default built-in manifest for unknown profiles", () => {
    const manifest = getSoundManifest("unknown-profile" as never);

    expect(manifest.profileId).toBe("the-call");
    expect(manifest.defaultVolumes.phone_ring).toBe(0.8);
    expect(manifest.timeline.length).toBeGreaterThan(0);
  });
});
