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

  it("uses an escalating layered bed for the-call ambient timeline", () => {
    const manifest = getSoundManifest("the-call");

    expect(manifest.timeline).toEqual(
      expect.arrayContaining([
        {
          time: 0,
          action: "start_ambient",
          soundIds: ["call_bed", "room_ambience", "electrical_hum"],
        },
        {
          time: 160,
          action: "fade_in",
          soundIds: ["phone_static"],
          fadeInSeconds: 6,
        },
        {
          time: 320,
          action: "fade_in",
          soundIds: ["sub_bass"],
          fadeInSeconds: 10,
        },
      ]),
    );
    expect(manifest.defaultVolumes.call_bed).toBe(0.16);
    expect(manifest.spatialMap.call_bed?.pan).toBe(0);
    expect(manifest.defaultVolumes.room_ambience).toBe(0.18);
  });
});
