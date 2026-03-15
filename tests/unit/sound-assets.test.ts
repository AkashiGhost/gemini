import { describe, expect, it } from "vitest";
import { getSoundAssetIds, getSoundAssets } from "@/lib/audio/sound-assets";

describe("getSoundAssets", () => {
  it("returns the-call authored ambient and sfx assets", () => {
    expect(getSoundAssets("the-call")).toEqual([
      {
        id: "call_bed",
        url: "/sounds/stories/the-call/ambient/the_call_midnight_line_loop.ogg",
      },
      {
        id: "room_ambience",
        url: "/sounds/stories/the-call/ambient/room_ambience.wav",
      },
      {
        id: "electrical_hum",
        url: "/sounds/stories/the-call/ambient/electrical_hum.ogg",
      },
      {
        id: "phone_static",
        url: "/sounds/stories/the-call/ambient/phone_static.ogg",
      },
      {
        id: "sub_bass",
        url: "/sounds/stories/the-call/ambient/sub_bass.ogg",
      },
      {
        id: "water_leak_loop",
        url: "/sounds/stories/the-call/ambient/water_leak_loop.ogg",
      },
      {
        id: "water_rising_loop",
        url: "/sounds/stories/the-call/ambient/water_rising_loop.ogg",
      },
      {
        id: "water_slosh_loop",
        url: "/sounds/stories/the-call/ambient/water_slosh_loop.wav",
      },
      {
        id: "door_creak",
        url: "/sounds/stories/the-call/sfx/door_creak.ogg",
      },
      {
        id: "footsteps",
        url: "/sounds/stories/the-call/sfx/footsteps.ogg",
      },
      {
        id: "footsteps_fast",
        url: "/sounds/stories/the-call/sfx/footsteps_fast.ogg",
      },
      {
        id: "heavy_breathing",
        url: "/sounds/stories/the-call/sfx/heavy_breathing.ogg",
      },
      {
        id: "anxious_breathing",
        url: "/sounds/stories/the-call/sfx/anxious_breathing.mp3",
      },
      {
        id: "door_slam",
        url: "/sounds/stories/the-call/sfx/door_slam.ogg",
      },
      {
        id: "pickup_click",
        url: "/sounds/stories/the-call/sfx/pickup_click.ogg",
      },
      {
        id: "keypad_beep",
        url: "/sounds/stories/the-call/sfx/keypad_beep.ogg",
      },
      {
        id: "keypad_confirm",
        url: "/sounds/stories/the-call/sfx/keypad_confirm.ogg",
      },
      {
        id: "keypad_invalid",
        url: "/sounds/stories/the-call/sfx/keypad_invalid.ogg",
      },
      {
        id: "disconnect_tone",
        url: "/sounds/stories/the-call/sfx/disconnect_tone.ogg",
      },
      {
        id: "water_drip",
        url: "/sounds/stories/the-call/sfx/water_drip.ogg",
      },
      {
        id: "metal_scrape",
        url: "/sounds/stories/the-call/sfx/metal_scrape.ogg",
      },
      {
        id: "pipe_clank",
        url: "/sounds/stories/the-call/sfx/pipe_clank.ogg",
      },
    ]);
  });

  it("returns an empty list for profiles without authored file assets", () => {
    expect(getSoundAssets("room-4b")).toEqual([]);
  });

  it("returns authored asset ids for precedence checks", () => {
    expect(getSoundAssetIds("the-call")).toEqual(
      new Set([
        "call_bed",
        "room_ambience",
        "electrical_hum",
        "phone_static",
        "sub_bass",
        "water_leak_loop",
        "water_rising_loop",
        "water_slosh_loop",
        "door_creak",
        "footsteps",
        "footsteps_fast",
        "heavy_breathing",
        "anxious_breathing",
        "door_slam",
        "pickup_click",
        "keypad_beep",
        "keypad_confirm",
        "keypad_invalid",
        "disconnect_tone",
        "water_drip",
        "metal_scrape",
        "pipe_clank",
      ]),
    );
  });
});
