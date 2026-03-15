import { DEFAULT_STORY_ID } from "@/lib/constants";
import type { TimelineEvent as SoundTimelineEvent } from "@/lib/sound-engine";
import type { SoundProfileId } from "@/lib/sound-profile";

export type SoundDirectorEvent = "threshold_entered" | "ending_reached";

export type SoundDirectorAction =
  | { kind: "triggerCue"; soundId: string; volume?: number; delayMs?: number }
  | { kind: "handleToolCall"; soundId: string; volume?: number; loop?: boolean; fadeInSeconds?: number; delayMs?: number }
  | { kind: "fadeAllToNothing"; fadeDurationSeconds: number; delayMs?: number };

export interface AuthoredSoundManifest {
  profileId: SoundProfileId;
  timeline: SoundTimelineEvent[];
  spatialMap: Record<string, { pan: number }>;
  defaultVolumes: Record<string, number>;
  eventActions?: Partial<Record<SoundDirectorEvent, SoundDirectorAction[]>>;
}

const AUTHORED_SOUND_MANIFESTS: Record<SoundProfileId, AuthoredSoundManifest> = {
  "the-last-session": {
    profileId: "the-last-session",
    timeline: [
      { time: 0, action: "start_ambient", soundIds: ["rain", "hvac", "clock"] },
      { time: 210, action: "fade_out", soundId: "hvac", fadeDurationSeconds: 4 },
      { time: 420, action: "hard_stop", soundId: "clock", fadeDurationSeconds: 0 },
      { time: 360, action: "fade_in", soundIds: ["cello_drone", "sub_bass"], fadeInSeconds: 8 },
      { time: 425, action: "volume_adjust", soundId: "rain", targetVolume: 0.4, fadeDurationSeconds: 10 },
      { time: 480, action: "mute_all", fadeDurationSeconds: 0.5 },
      { time: 482, action: "fade_in", soundIds: ["low_tone"], fadeInSeconds: 3 },
      { time: 600, action: "fade_out", soundId: "low_tone", fadeDurationSeconds: 4 },
    ],
    spatialMap: {
      rain: { pan: -0.3 },
      clock: { pan: 0.2 },
      hvac: { pan: 0 },
      cello_drone: { pan: 0 },
      sub_bass: { pan: 0 },
      low_tone: { pan: 0 },
    },
    defaultVolumes: {
      rain: 0.7,
      hvac: 0.38,
      clock: 0.34,
      cello_drone: 0.32,
      sub_bass: 0.28,
      low_tone: 0.3,
    },
  },
  "the-lighthouse": {
    profileId: "the-lighthouse",
    timeline: [
      { time: 0, action: "start_ambient", soundIds: ["ocean", "wind", "creak"] },
      { time: 240, action: "volume_adjust", soundId: "wind", targetVolume: 0.8, fadeDurationSeconds: 8 },
      { time: 360, action: "fade_out", soundId: "creak", fadeDurationSeconds: 3 },
      { time: 380, action: "fade_in", soundIds: ["foghorn_drone", "sub_bass"], fadeInSeconds: 6 },
      { time: 450, action: "fade_out", soundId: "wind", fadeDurationSeconds: 8 },
      { time: 540, action: "fade_all_to_nothing", fadeDurationSeconds: 20 },
    ],
    spatialMap: {
      ocean: { pan: -0.4 },
      wind: { pan: 0.3 },
      creak: { pan: 0.1 },
      foghorn_drone: { pan: -0.2 },
      sub_bass: { pan: 0 },
    },
    defaultVolumes: {
      ocean: 0.68,
      wind: 0.42,
      creak: 0.22,
      foghorn_drone: 0.34,
      sub_bass: 0.28,
    },
  },
  "room-4b": {
    profileId: "room-4b",
    timeline: [
      { time: 0, action: "start_ambient", soundIds: ["fluorescent_hum", "machinery"] },
      { time: 180, action: "fade_in", soundIds: ["metal_echo"], fadeInSeconds: 4 },
      { time: 240, action: "volume_adjust", soundId: "fluorescent_hum", targetVolume: 0.3, fadeDurationSeconds: 2 },
      { time: 360, action: "hard_stop", soundId: "machinery", fadeDurationSeconds: 0 },
      { time: 365, action: "fade_in", soundIds: ["heartbeat_drone", "sub_bass"], fadeInSeconds: 6 },
      { time: 450, action: "hard_stop", soundId: "fluorescent_hum", fadeDurationSeconds: 0 },
      { time: 455, action: "fade_in", soundIds: ["low_tone"], fadeInSeconds: 4 },
      { time: 540, action: "fade_all_to_nothing", fadeDurationSeconds: 15 },
    ],
    spatialMap: {
      fluorescent_hum: { pan: 0.1 },
      machinery: { pan: -0.3 },
      metal_echo: { pan: 0.4 },
      heartbeat_drone: { pan: 0 },
      sub_bass: { pan: 0 },
      low_tone: { pan: 0 },
    },
    defaultVolumes: {
      fluorescent_hum: 0.34,
      machinery: 0.26,
      metal_echo: 0.18,
      heartbeat_drone: 0.28,
      sub_bass: 0.24,
      low_tone: 0.28,
    },
  },
  "the-call": {
    profileId: "the-call",
    timeline: [
      { time: 0, action: "start_ambient", soundIds: ["call_bed", "room_ambience", "electrical_hum"] },
      { time: 160, action: "fade_in", soundIds: ["phone_static"], fadeInSeconds: 6 },
      { time: 260, action: "volume_adjust", soundId: "call_bed", targetVolume: 0.24, fadeDurationSeconds: 10 },
      { time: 320, action: "fade_in", soundIds: ["sub_bass"], fadeInSeconds: 10 },
      { time: 420, action: "volume_adjust", soundId: "phone_static", targetVolume: 0.13, fadeDurationSeconds: 12 },
      { time: 480, action: "volume_adjust", soundId: "call_bed", targetVolume: 0.28, fadeDurationSeconds: 12 },
      { time: 510, action: "volume_adjust", soundId: "sub_bass", targetVolume: 0.18, fadeDurationSeconds: 10 },
      { time: 540, action: "fade_all_to_nothing", fadeDurationSeconds: 15 },
    ],
    spatialMap: {
      call_bed: { pan: 0 },
      room_ambience: { pan: 0.04 },
      phone_static: { pan: 0 },
      electrical_hum: { pan: 0 },
      sub_bass: { pan: 0 },
      water_leak_loop: { pan: 0.1 },
      water_rising_loop: { pan: 0.05 },
      water_slosh_loop: { pan: 0.12 },
      phone_ring: { pan: 0 },
      pickup_click: { pan: 0 },
      disconnect_tone: { pan: 0 },
      footsteps: { pan: -0.2 },
      footsteps_fast: { pan: -0.15 },
      water_drip: { pan: 0.3 },
      door_creak: { pan: -0.1 },
      door_slam: { pan: -0.05 },
      keypad_beep: { pan: 0 },
      keypad_confirm: { pan: 0 },
      keypad_invalid: { pan: 0 },
      metal_scrape: { pan: 0.2 },
      pipe_clank: { pan: 0.4 },
      anxious_breathing: { pan: 0 },
      heavy_breathing: { pan: 0 },
      glass_break: { pan: 0.25 },
    },
    defaultVolumes: {
      call_bed: 0.16,
      room_ambience: 0.18,
      phone_static: 0.08,
      electrical_hum: 0.08,
      sub_bass: 0.12,
      water_leak_loop: 0.12,
      water_rising_loop: 0.16,
      water_slosh_loop: 0.14,
      phone_ring: 0.8,
      pickup_click: 0.9,
      disconnect_tone: 0.7,
      footsteps: 0.78,
      footsteps_fast: 0.86,
      water_drip: 0.44,
      door_creak: 0.42,
      door_slam: 0.72,
      keypad_beep: 0.6,
      keypad_confirm: 0.55,
      keypad_invalid: 0.62,
      metal_scrape: 0.5,
      pipe_clank: 0.52,
      anxious_breathing: 0.38,
      heavy_breathing: 0.5,
      glass_break: 0.68,
    },
  },
  "me-and-mes": {
    profileId: "me-and-mes",
    timeline: [
      { time: 0, action: "start_ambient", soundIds: ["sleep_hush"] },
      { time: 0.15, action: "start_intermittent", soundIds: ["bed_rustle"] },
      { time: 1.4, action: "start_intermittent", soundIds: ["settling_breath"] },
    ],
    spatialMap: {
      sleep_hush: { pan: 0 },
      bed_rustle: { pan: -0.08 },
      settling_breath: { pan: 0 },
      threshold_tone: { pan: 0 },
      chamber_hum: { pan: 0 },
      door_creak: { pan: -0.16 },
      footsteps: { pan: -0.08 },
      room_close: { pan: 0.04 },
    },
    defaultVolumes: {
      sleep_hush: 0.1,
      bed_rustle: 0.22,
      settling_breath: 0.18,
      threshold_tone: 0.18,
      chamber_hum: 0.14,
      door_creak: 0.26,
      footsteps: 0.2,
      room_close: 0.34,
    },
    eventActions: {
      threshold_entered: [
        { kind: "triggerCue", soundId: "threshold_tone", volume: 0.18 },
        { kind: "triggerCue", soundId: "door_creak", volume: 0.24 },
        { kind: "triggerCue", soundId: "footsteps", volume: 0.16, delayMs: 220 },
        { kind: "handleToolCall", soundId: "chamber_hum", volume: 0.14, loop: true, fadeInSeconds: 2.8, delayMs: 450 },
      ],
      ending_reached: [
        { kind: "triggerCue", soundId: "room_close", volume: 0.3 },
        { kind: "fadeAllToNothing", fadeDurationSeconds: 4, delayMs: 350 },
      ],
    },
  },
};

const DEFAULT_SOUND_MANIFEST = AUTHORED_SOUND_MANIFESTS[DEFAULT_STORY_ID as SoundProfileId];

export function getSoundManifest(soundProfileId: string): AuthoredSoundManifest {
  return AUTHORED_SOUND_MANIFESTS[soundProfileId as SoundProfileId] ?? DEFAULT_SOUND_MANIFEST;
}
