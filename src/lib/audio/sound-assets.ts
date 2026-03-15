import type { SoundProfileId } from "@/lib/sound-profile";

export interface SoundAsset {
  id: string;
  url: string;
}

const SOUND_ASSETS: Partial<Record<SoundProfileId, SoundAsset[]>> = {
  "the-call": [
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
  ],
};

export function getSoundAssets(soundProfileId: SoundProfileId): SoundAsset[] {
  return SOUND_ASSETS[soundProfileId] ?? [];
}

export function getSoundAssetIds(soundProfileId: SoundProfileId): Set<string> {
  return new Set(getSoundAssets(soundProfileId).map((asset) => asset.id));
}
