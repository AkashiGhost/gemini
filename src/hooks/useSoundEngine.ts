"use client";

// ─────────────────────────────────────────────
// useSoundEngine — React hook that manages the SoundEngine lifecycle
// Story-aware: loads appropriate sounds and timeline per storyId.
// ─────────────────────────────────────────────

import { useEffect, useRef, useCallback, useMemo } from "react";
import { SoundEngine } from "@/lib/sound-engine";
import { generateSoundsForStory } from "@/lib/synth-sounds";
import type { TimelineEvent as SoundTimelineEvent } from "@/lib/sound-engine";
import { parseSoundCues } from "@/lib/sound-cue-parser";
import { AUDIO_CONFIG } from "@/lib/config/audio";
import { DEBUG_CONFIG } from "@/lib/config/debug";
import type { LiveToolCallListener } from "@/lib/config/live-tools";
import { LYRIA_RUNTIME_CONFIG } from "@/lib/config/lyria";
import { createLogger, extendCausalChain } from "@/lib/logging";
import { MusicEngine } from "@/lib/music-engine";
import { getStoryRuntimeProfile } from "@/lib/story-runtime";
import {
  detectTranscriptIntentCueSoundIds,
  getTranscriptIntentCueRules,
  selectCuesOffCooldown,
} from "@/lib/sound-intent-fallback";
import { useSoundPref } from "@/lib/sound-preferences";

// ─────────────────────────────────────────────
// Story-specific timelines
// ─────────────────────────────────────────────

const TIMELINES: Record<string, SoundTimelineEvent[]> = {
  "the-last-session": [
    // Phase 1: Full ambient
    { time: 0, action: "start_ambient", soundIds: ["rain", "hvac", "clock"] },
    // Phase 2: Subtractive horror — HVAC fades
    { time: 210, action: "fade_out", soundId: "hvac", fadeDurationSeconds: 4 },
    // Phase 2: Clock hard stop
    { time: 420, action: "hard_stop", soundId: "clock", fadeDurationSeconds: 0 },
    // Phase 3: Atmospheric drones
    { time: 360, action: "fade_in", soundIds: ["cello_drone", "sub_bass"], fadeInSeconds: 8 },
    // Phase 3: Rain volume drop
    { time: 425, action: "volume_adjust", soundId: "rain", targetVolume: 0.4, fadeDurationSeconds: 10 },
    // Phase 4: Mute all for revelation
    { time: 480, action: "mute_all", fadeDurationSeconds: 0.5 },
    // Phase 4: Revelation tone
    { time: 482, action: "fade_in", soundIds: ["low_tone"], fadeInSeconds: 3 },
    // Phase 5: Low tone fades
    { time: 600, action: "fade_out", soundId: "low_tone", fadeDurationSeconds: 4 },
  ],

  "the-lighthouse": [
    // Phase 1: Storm — ocean, wind, creaking wood
    { time: 0, action: "start_ambient", soundIds: ["ocean", "wind", "creak"] },
    // Phase 2: Wind intensifies
    { time: 240, action: "volume_adjust", soundId: "wind", targetVolume: 0.8, fadeDurationSeconds: 8 },
    // Phase 3: Creaking stops (structure groans to silence)
    { time: 360, action: "fade_out", soundId: "creak", fadeDurationSeconds: 3 },
    // Phase 3: Foghorn drone emerges
    { time: 380, action: "fade_in", soundIds: ["foghorn_drone", "sub_bass"], fadeInSeconds: 6 },
    // Phase 4: Subtractive — wind dies
    { time: 450, action: "fade_out", soundId: "wind", fadeDurationSeconds: 8 },
    // Phase 5: Just ocean and foghorn, fading
    { time: 540, action: "fade_all_to_nothing", fadeDurationSeconds: 20 },
  ],

  "room-4b": [
    // Phase 1: Hospital ambient — fluorescent hum, distant machinery
    { time: 0, action: "start_ambient", soundIds: ["fluorescent_hum", "machinery"] },
    // Phase 2: Metal echoes begin
    { time: 180, action: "fade_in", soundIds: ["metal_echo"], fadeInSeconds: 4 },
    // Phase 2: Fluorescent flickers (volume oscillation simulated by lowering)
    { time: 240, action: "volume_adjust", soundId: "fluorescent_hum", targetVolume: 0.3, fadeDurationSeconds: 2 },
    // Phase 3: Machinery stops abruptly
    { time: 360, action: "hard_stop", soundId: "machinery", fadeDurationSeconds: 0 },
    // Phase 3: Heartbeat drone emerges
    { time: 365, action: "fade_in", soundIds: ["heartbeat_drone", "sub_bass"], fadeInSeconds: 6 },
    // Phase 4: Fluorescent dies
    { time: 450, action: "hard_stop", soundId: "fluorescent_hum", fadeDurationSeconds: 0 },
    // Phase 4: Low revelation tone
    { time: 455, action: "fade_in", soundIds: ["low_tone"], fadeInSeconds: 4 },
    // Phase 5: Everything fades
    { time: 540, action: "fade_all_to_nothing", fadeDurationSeconds: 15 },
  ],

  "the-call": [
    // ── Phone ring now plays during OnboardingFlow "ringing" step ──
    // (before live voice session starts, so ring → pickup → Alex speaks)

    // Phone static starts immediately at near-inaudible volume
    { time: 0, action: "start_ambient", soundIds: ["phone_static"] },
    { time: 0, action: "volume_adjust", soundId: "phone_static", targetVolume: 0.08, fadeDurationSeconds: 0 },

    // ── Pickup ────────────────────────────────────────────────
    // pickup_click is event-driven (fires when AI first speaks, see useSoundEngine)
    // Electrical hum + static swell start immediately (call already connected)
    { time: 0, action: "start_ambient", soundIds: ["electrical_hum"] },
    { time: 0, action: "volume_adjust", soundId: "phone_static", targetVolume: 0.22, fadeDurationSeconds: 2 },

    // ── Mid-game tension ──────────────────────────────────────
    // Sub bass creeps in after a couple minutes
    { time: 120, action: "fade_in", soundIds: ["sub_bass"], fadeInSeconds: 10 },
    // Static intensifies slightly mid-game (line degrading, situation escalating)
    { time: 300, action: "volume_adjust", soundId: "phone_static", targetVolume: 0.35, fadeDurationSeconds: 8 },

    // ── Ending ────────────────────────────────────────────────
    // Everything fades toward the end
    { time: 540, action: "fade_all_to_nothing", fadeDurationSeconds: 15 },
  ],
};

// Story-specific spatial panning
const SPATIAL_MAPS: Record<string, Record<string, { pan: number }>> = {
  "the-last-session": {
    rain: { pan: -0.3 },
    clock: { pan: 0.2 },
    hvac: { pan: 0 },
    cello_drone: { pan: 0 },
    sub_bass: { pan: 0 },
    low_tone: { pan: 0 },
  },
  "the-lighthouse": {
    ocean: { pan: -0.4 },
    wind: { pan: 0.3 },
    creak: { pan: 0.1 },
    foghorn_drone: { pan: -0.2 },
    sub_bass: { pan: 0 },
  },
  "room-4b": {
    fluorescent_hum: { pan: 0.1 },
    machinery: { pan: -0.3 },
    metal_echo: { pan: 0.4 },
    heartbeat_drone: { pan: 0 },
    sub_bass: { pan: 0 },
    low_tone: { pan: 0 },
  },
  "the-call": {
    phone_static: { pan: 0 },      // centered (phone audio)
    electrical_hum: { pan: 0 },    // centered
    sub_bass: { pan: 0 },          // centered
    phone_ring: { pan: 0 },        // centered
    pickup_click: { pan: 0 },      // centered
    disconnect_tone: { pan: 0 },   // centered (all phone sounds are mono/centered)
    footsteps: { pan: -0.2 },      // slightly left (Alex moving)
    water_drip: { pan: 0.3 },      // off to the right (environmental)
    door_creak: { pan: -0.1 },     // slightly left
    door_slam: { pan: -0.05 },     // near-center left (heavy close-range impact)
    keypad_beep: { pan: 0 },       // centered (close interaction)
    metal_scrape: { pan: 0.2 },    // slight right (vent above)
    pipe_clank: { pan: 0.4 },      // right wall (pipes on right wall per story)
    heavy_breathing: { pan: 0 },   // centered (Alex's own breathing)
    glass_break: { pan: 0.25 },    // right-front shard impact
  },
};

const DEFAULT_VOLUMES: Record<string, Record<string, number>> = {
  "the-last-session": {
    rain: 0.7,
    hvac: 0.38,
    clock: 0.34,
    cello_drone: 0.32,
    sub_bass: 0.28,
    low_tone: 0.3,
  },
  "the-lighthouse": {
    ocean: 0.68,
    wind: 0.42,
    creak: 0.22,
    foghorn_drone: 0.34,
    sub_bass: 0.28,
  },
  "room-4b": {
    fluorescent_hum: 0.34,
    machinery: 0.26,
    metal_echo: 0.18,
    heartbeat_drone: 0.28,
    sub_bass: 0.24,
    low_tone: 0.28,
  },
  "the-call": {
    phone_static: 0.12,
    electrical_hum: 0.2,
    sub_bass: 0.24,
    phone_ring: 0.8,
    pickup_click: 0.9,
    disconnect_tone: 0.7,
    footsteps: 0.55,
    water_drip: 0.4,
    door_creak: 0.42,
    door_slam: 0.72,
    keypad_beep: 0.55,
    metal_scrape: 0.5,
    pipe_clank: 0.52,
    heavy_breathing: 0.48,
    glass_break: 0.68,
  },
};

const CUE_COOLDOWN_MS = AUDIO_CONFIG.cueCooldownMs;
const TRANSCRIPT_INTENT_FALLBACK_DELAY_MS = AUDIO_CONFIG.transcriptIntentFallbackDelayMs;
const TRANSCRIPT_TOOL_PRIORITY_WINDOW_MS = AUDIO_CONFIG.transcriptIntentToolPriorityWindowMs;

interface UseSoundEngineOptions {
  storyId: string;
  enableAdaptiveMusic: boolean;
  sessionId?: string;
  status: "idle" | "connecting" | "playing" | "ended" | "error";
  isSpeaking: boolean;
  isPaused: boolean;
  lastAiText: string;
  lastUserTranscriptText: string;
  lastUserTranscriptSeq: number;
  onToolCall: (listener: LiveToolCallListener) => () => void;
}

export function useSoundEngine({
  storyId,
  enableAdaptiveMusic,
  sessionId,
  status,
  isSpeaking,
  isPaused,
  lastAiText,
  lastUserTranscriptText,
  lastUserTranscriptSeq,
  onToolCall,
}: UseSoundEngineOptions) {
  const logger = useMemo(() => createLogger("useSoundEngine"), []);
  const runtimeProfile = useMemo(() => getStoryRuntimeProfile(storyId), [storyId]);
  const soundOn = useSoundPref();
  const engineRef = useRef<SoundEngine | null>(null);
  const musicEngineRef = useRef<MusicEngine | null>(null);
  const initStartedRef = useRef(false);
  // Tracks whether we've already fired the phone-pickup sequence for "the-call"
  const hasPickedUpRef = useRef(false);
  // Tracks cooldowns for keyword-triggered sound cues (soundId → timestamp)
  const cueCooldownsRef = useRef<Map<string, number>>(new Map());
  // Timestamp for latest authoritative trigger_sound tool call.
  const lastToolSoundTriggerAtRef = useRef(0);

  // ── Initialize engine when game starts playing ────────────
  // Configurable delay defaults to 0. We still keep it tunable for debugging.
  useEffect(() => {
    if (status !== "playing" || initStartedRef.current) return;
    initStartedRef.current = true;
    const INIT_DELAY_MS = AUDIO_CONFIG.engineInitDelayMs;
    let cancelled = false;

    const setup = async () => {
      try {
        logger.info({
          event: "sound.init_start",
          sessionId,
          causalChain: ["sound.init_start"],
          data: { storyId, initDelayMs: INIT_DELAY_MS },
        });

        const spatialMap = SPATIAL_MAPS[storyId] ?? SPATIAL_MAPS["the-last-session"];
        const engine = new SoundEngine({
          ttsDucking: AUDIO_CONFIG.ttsDucking,
          crossfadeDefaultMs: AUDIO_CONFIG.crossfadeDefaultMs,
          spatialMap,
          defaultVolumes: DEFAULT_VOLUMES[storyId] ?? DEFAULT_VOLUMES["the-last-session"],
          preloadOrder: [],
        });

        await engine.init();
        if (cancelled) return;
        engine.setSoundEnabled(soundOn, 0);

        // Generate and register story-specific synthetic sounds
        const sounds = await generateSoundsForStory(storyId);
        if (cancelled) return;
        for (const [id, buffer] of Object.entries(sounds)) {
          engine.registerBuffer(id, buffer);
        }

        engineRef.current = engine;

        // Start the story-specific timeline
        const timeline = TIMELINES[storyId] ?? TIMELINES["the-last-session"];
        engine.startTimeline(timeline);

        if (!LYRIA_RUNTIME_CONFIG.enabled || !enableAdaptiveMusic) {
          logger.info({
            event: "music.disabled_by_config",
            sessionId,
            causalChain: ["sound.init_start", "music.disabled_by_config"],
            data: { enableAdaptiveMusic, lyriaEnabled: LYRIA_RUNTIME_CONFIG.enabled },
          });
        } else {
          // Adaptive music is optional. If it fails, we soft-fail and continue.
          try {
            const auxGain = engine.createAuxGain(0);
            const musicEngine = new MusicEngine({
              audioContext: engine.getAudioContext(),
              gainNode: auxGain,
            });
            musicEngineRef.current = musicEngine;
            const connected = await musicEngine.connect();
            logger.info({
              event: connected ? "music.connected" : "music.disabled_soft_fail",
              sessionId,
              causalChain: ["sound.init_start", "music.connect"],
            });
          } catch (musicError) {
            logger.warn({
              event: "music.disabled_soft_fail",
              sessionId,
              causalChain: ["sound.init_start", "music.connect_failed"],
              error: musicError,
            });
          }
        }

        logger.info({
          event: "sound.init_ready",
          sessionId,
          causalChain: ["sound.init_start", "sound.init_ready"],
          data: { storyId, timelineEvents: timeline.length },
        });
      } catch (err) {
        logger.error({
          event: "sound.init_failed",
          sessionId,
          causalChain: ["sound.init_start", "sound.init_failed"],
          error: err,
          data: { storyId },
        });
        initStartedRef.current = false;
      }
    };

    const delayTimer = setTimeout(() => void setup(), INIT_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(delayTimer);
    };
  }, [enableAdaptiveMusic, logger, sessionId, soundOn, status, storyId]);

  // ── TTS Ducking ───────────────────────────────────────
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (isSpeaking) {
      engine.startDucking();
    } else {
      engine.stopDucking();
    }
  }, [isSpeaking]);

  // ── Global sound preference ───────────────────────────
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setSoundEnabled(soundOn, 0.2);
    logger.info({
      event: "sound.preference_applied",
      sessionId,
      causalChain: ["sound.preference_applied"],
      data: { soundOn, storyId },
    });
  }, [logger, sessionId, soundOn, storyId]);

  // ── Phone pickup — stop ring when AI first speaks ─────
  // Only active for "the-call" story.
  // Fires once: the first time the AI is detected speaking.
  useEffect(() => {
    if (storyId !== "the-call") return;
    if (!isSpeaking) return;
    if (hasPickedUpRef.current) return; // already fired

    const engine = engineRef.current;
    if (!engine) return;

    hasPickedUpRef.current = true;
    console.log("[USE-SOUND] AI first speak detected — stopping phone_ring, playing pickup_click");
    engine.stop("phone_ring", 0); // hard stop — ring cuts immediately
    engine.play("pickup_click", 0.9, false); // one-shot click
  }, [isSpeaking, storyId]);

  // ── Authoritative tool-call path ───────────────────────────
  useEffect(() => {
    const unsubscribe = onToolCall((toolCall) => {
      const engine = engineRef.current;
      const musicEngine = musicEngineRef.current;

      if (toolCall.name === "trigger_sound" && engine) {
        const now = Date.now();
        lastToolSoundTriggerAtRef.current = now;
        cueCooldownsRef.current.set(toolCall.args.soundId, now);
        engine.handleToolCall(
          toolCall.args.soundId,
          toolCall.args.volume ?? AUDIO_CONFIG.defaultCueVolume,
          toolCall.args.loop ?? false,
          toolCall.args.fadeInSeconds ?? 0,
        );
        logger.info({
          event: "tool.trigger_sound.applied",
          sessionId,
          causalChain: extendCausalChain(toolCall.causalChain, "tool.trigger_sound.applied"),
          data: { soundId: toolCall.args.soundId },
        });
        return;
      }

      if (toolCall.name === "set_tension") {
        void musicEngine?.updateTension(
          toolCall.args.tension,
          toolCall.args.transitionSeconds,
        );
        logger.info({
          event: "tool.set_tension.forwarded",
          sessionId,
          causalChain: extendCausalChain(toolCall.causalChain, "tool.set_tension.forwarded"),
          data: {
            tension: toolCall.args.tension,
            transitionSeconds: toolCall.args.transitionSeconds,
          },
        });
        return;
      }

      if (toolCall.name === "end_game" && engine) {
        engine.fadeAllToNothing(toolCall.args.fadeOutSeconds ?? AUDIO_CONFIG.endGameFadeOutSeconds);
        logger.info({
          event: "tool.end_game.audio_fade",
          sessionId,
          causalChain: extendCausalChain(toolCall.causalChain, "tool.end_game.audio_fade"),
          data: { fadeOutSeconds: toolCall.args.fadeOutSeconds ?? AUDIO_CONFIG.endGameFadeOutSeconds },
        });
      }
    });

    return () => unsubscribe();
  }, [logger, onToolCall, sessionId]);

  // ── Keyword-based reactive sound cues ─────────────────
  // Parse AI narration text for keywords that match story sounds.
  // Triggers one-shot cues via triggerCue() with a per-sound cooldown.
  useEffect(() => {
    if (runtimeProfile.soundStrategy !== "timeline_scripted") return;
    if (!DEBUG_CONFIG.enableKeywordCueFallback) return;
    if (!lastAiText || status !== "playing") return;
    const engine = engineRef.current;
    if (!engine) return;

    const { cues } = parseSoundCues(lastAiText);
    const selection = selectCuesOffCooldown(
      cues.map((cue) => cue.soundId),
      cueCooldownsRef.current,
      { nowMs: Date.now(), cooldownMs: CUE_COOLDOWN_MS },
    );

    for (const cooledDownCueId of selection.coolingDownCueIds) {
      console.log(`[USE-SOUND] Cue cooldown active for "${cooledDownCueId}" — skipping`);
    }

    for (const cueId of selection.readyCueIds) {
      console.log(`[USE-SOUND] Inline cue triggered: "${cueId}"`);
      engine.triggerCue(cueId);
    }
  }, [lastAiText, runtimeProfile.soundStrategy, status, storyId]);

  // ── Deterministic transcript intent fallback (tool-call aware) ──
  // If no authoritative trigger_sound arrives shortly after a user turn,
  // map transcript intent keywords to a deterministic cue list.
  useEffect(() => {
    if (runtimeProfile.soundStrategy !== "timeline_scripted") return;
    if (!DEBUG_CONFIG.enableKeywordCueFallback) return;
    if (status !== "playing") return;
    if (!lastUserTranscriptText.trim()) return;
    const rules = getTranscriptIntentCueRules(storyId);
    if (rules.length === 0) return;

    const timer = setTimeout(() => {
      const engine = engineRef.current;
      if (!engine) return;

      const now = Date.now();
      if (now - lastToolSoundTriggerAtRef.current <= TRANSCRIPT_TOOL_PRIORITY_WINDOW_MS) {
        logger.info({
          event: "sound.transcript_fallback.skipped_tool_priority",
          sessionId,
          causalChain: ["sound.transcript_fallback", "skipped_tool_priority"],
          data: { storyId, lastUserTranscriptSeq },
        });
        return;
      }

      const detectedCueIds = detectTranscriptIntentCueSoundIds(lastUserTranscriptText, rules);
      if (detectedCueIds.length === 0) return;

      const selection = selectCuesOffCooldown(detectedCueIds, cueCooldownsRef.current, {
        nowMs: now,
        cooldownMs: CUE_COOLDOWN_MS,
      });

      for (const cooledDownCueId of selection.coolingDownCueIds) {
        logger.info({
          event: "sound.transcript_fallback.cooldown_skip",
          sessionId,
          causalChain: ["sound.transcript_fallback", "cooldown_skip"],
          data: { soundId: cooledDownCueId, storyId, lastUserTranscriptSeq },
        });
      }

      for (const cueId of selection.readyCueIds) {
        logger.info({
          event: "sound.transcript_fallback.triggered",
          sessionId,
          causalChain: ["sound.transcript_fallback", "triggered"],
          data: { soundId: cueId, storyId, lastUserTranscriptSeq },
        });
        engine.triggerCue(cueId);
      }
    }, TRANSCRIPT_INTENT_FALLBACK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [lastUserTranscriptSeq, lastUserTranscriptText, logger, runtimeProfile.soundStrategy, sessionId, status, storyId]);

  // ── Pause / Resume ────────────────────────────────────
  useEffect(() => {
    const engine = engineRef.current;
    const musicEngine = musicEngineRef.current;
    if (!engine) return;
    if (isPaused) {
      engine.pauseAudio();
      musicEngine?.pause();
    } else {
      engine.resumeAudio();
      musicEngine?.resume();
    }
  }, [isPaused]);

  // ── Cleanup on game end ───────────────────────────────
  useEffect(() => {
    if (status === "ended" || status === "error") {
      const engine = engineRef.current;
      const musicEngine = musicEngineRef.current;
      if (musicEngine) {
        musicEngine.destroy();
        musicEngineRef.current = null;
      }
      if (engine) {
        engine.destroy();
        engineRef.current = null;
        initStartedRef.current = false;
      }
    }
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const engine = engineRef.current;
      const musicEngine = musicEngineRef.current;
      if (musicEngine) {
        musicEngine.destroy();
        musicEngineRef.current = null;
      }
      if (engine) {
        engine.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  const stopAll = useCallback(() => {
    engineRef.current?.muteAll(0.5);
  }, []);

  return { stopAll };
}
