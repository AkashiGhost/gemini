"use client";

// ─────────────────────────────────────────────
// useSoundEngine — React hook that manages the SoundEngine lifecycle
// Story-aware: loads appropriate sounds and timeline per storyId.
// ─────────────────────────────────────────────

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { SoundEngine } from "@/lib/sound-engine";
import { generateSoundsForStory } from "@/lib/synth-sounds";
import { AUDIO_CONFIG } from "@/lib/config/audio";
import { DEBUG_CONFIG } from "@/lib/config/debug";
import type { LiveToolCallListener } from "@/lib/config/live-tools";
import { LYRIA_RUNTIME_CONFIG } from "@/lib/config/lyria";
import { createLogger, extendCausalChain } from "@/lib/logging";
import { MusicEngine } from "@/lib/music-engine";
import { getStoryRuntimeProfile } from "@/lib/story-runtime";
import {
  detectNarrativeCueSoundIds,
  detectTranscriptIntentCueSoundIds,
  getTranscriptIntentCueRules,
  selectCuesOffCooldown,
} from "@/lib/sound-intent-fallback";
import { useSoundPref } from "@/lib/sound-preferences";
import type { SoundProfileId } from "@/lib/sound-profile";
import { getSoundManifest } from "@/lib/audio/sound-manifests";
import { getSoundAssetIds, getSoundAssets } from "@/lib/audio/sound-assets";
import { AudioDirector } from "@/lib/audio/audio-director";
import { TheCallStateDirector } from "@/lib/audio/the-call-state-director";

const CUE_COOLDOWN_MS = AUDIO_CONFIG.cueCooldownMs;
const TRANSCRIPT_INTENT_FALLBACK_DELAY_MS = AUDIO_CONFIG.transcriptIntentFallbackDelayMs;
const TRANSCRIPT_TOOL_PRIORITY_WINDOW_MS = AUDIO_CONFIG.transcriptIntentToolPriorityWindowMs;
const DISABLED_SOUND_IDS_BY_PROFILE: Partial<Record<SoundProfileId, ReadonlySet<string>>> = {
  "the-call": new Set(["anxious_breathing", "heavy_breathing"]),
};

interface UseSoundEngineOptions {
  storyId: string;
  soundProfileId: SoundProfileId;
  enableAdaptiveMusic: boolean;
  sessionId?: string;
  status: "idle" | "connecting" | "playing" | "ended" | "error";
  isSpeaking: boolean;
  isPaused: boolean;
  lastAiText: string;
  lastAiTranscriptText: string;
  lastAiTranscriptSeq: number;
  lastUserTranscriptText: string;
  lastUserTranscriptSeq: number;
  onToolCall: (listener: LiveToolCallListener) => () => void;
}

function isSoundIdBlocked(soundProfileId: SoundProfileId, soundId: string): boolean {
  return DISABLED_SOUND_IDS_BY_PROFILE[soundProfileId]?.has(soundId) ?? false;
}

export function useSoundEngine({
  storyId,
  soundProfileId,
  enableAdaptiveMusic,
  sessionId,
  status,
  isSpeaking,
  isPaused,
  lastAiText,
  lastAiTranscriptText,
  lastAiTranscriptSeq,
  lastUserTranscriptText,
  lastUserTranscriptSeq,
  onToolCall,
}: UseSoundEngineOptions) {
  const logger = useMemo(() => createLogger("useSoundEngine"), []);
  const runtimeProfile = useMemo(() => getStoryRuntimeProfile(soundProfileId), [soundProfileId]);
  const useTheCallStateDirector = useMemo(
    () => soundProfileId === "the-call" && runtimeProfile.audioArchitecture === "state_director_v2_candidate",
    [runtimeProfile.audioArchitecture, soundProfileId],
  );
  const enableReactiveCueFallback = useMemo(
    () => !useTheCallStateDirector && (runtimeProfile.soundStrategy === "timeline_scripted" || soundProfileId === "the-call"),
    [runtimeProfile.soundStrategy, soundProfileId, useTheCallStateDirector],
  );
  const soundOn = useSoundPref();
  const engineRef = useRef<SoundEngine | null>(null);
  const musicEngineRef = useRef<MusicEngine | null>(null);
  const audioDirectorRef = useRef<AudioDirector | null>(null);
  const theCallStateDirectorRef = useRef<TheCallStateDirector | null>(null);
  const [theCallDirectorReadyRevision, setTheCallDirectorReadyRevision] = useState(0);
  const initStartedRef = useRef(false);
  const isSpeakingRef = useRef(isSpeaking);
  // Tracks whether we've already fired the phone-pickup sequence for "the-call"
  const hasPickedUpRef = useRef(false);
  // Tracks stateful flood escalation for "the-call".
  const theCallWaterStageRef = useRef(0);
  // Tracks cooldowns for keyword-triggered sound cues (soundId → timestamp)
  const cueCooldownsRef = useRef<Map<string, number>>(new Map());
  // Timestamp for latest authoritative trigger_sound tool call.
  const lastToolSoundTriggerAtRef = useRef(0);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

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
          data: { storyId, soundProfileId, initDelayMs: INIT_DELAY_MS },
        });

        const manifest = getSoundManifest(soundProfileId);
        const soundAssets = getSoundAssets(soundProfileId);
        const authoredAssetIds = getSoundAssetIds(soundProfileId);
        const engine = new SoundEngine({
          ttsDucking: AUDIO_CONFIG.ttsDucking,
          crossfadeDefaultMs: AUDIO_CONFIG.crossfadeDefaultMs,
          spatialMap: manifest.spatialMap,
          defaultVolumes: manifest.defaultVolumes,
          preloadOrder: [],
        });

        await engine.init();
        if (cancelled) return;
        engine.setSoundEnabled(soundOn, 0);

        if (soundAssets.length > 0) {
          await engine.preload(soundAssets);
          if (cancelled) return;
        }

        // Generate and register story-specific synthetic sounds
        const sounds = await generateSoundsForStory(soundProfileId);
        if (cancelled) return;
        for (const [id, buffer] of Object.entries(sounds)) {
          if (authoredAssetIds.has(id)) {
            logger.info({
              event: "sound.synthetic_skipped_for_authored_asset",
              sessionId,
              causalChain: ["sound.init_start", "sound.synthetic_skipped_for_authored_asset"],
              data: { soundId: id, storyId, soundProfileId },
            });
            continue;
          }
          engine.registerBuffer(id, buffer);
        }

        engineRef.current = engine;
        audioDirectorRef.current = new AudioDirector({
          engine,
          manifest,
        });
        theCallStateDirectorRef.current = useTheCallStateDirector
          ? new TheCallStateDirector(engine)
          : null;
        if (useTheCallStateDirector) {
          setTheCallDirectorReadyRevision((revision) => revision + 1);
          logger.info({
            event: "sound.the_call_state_director.ready",
            sessionId,
            causalChain: ["sound.init_start", "sound.the_call_state_director.ready"],
            data: { storyId, soundProfileId },
          });
        }

        // Start the story-specific timeline
        engine.startTimeline(manifest.timeline);

        if (storyId === "the-call") {
          if (isSpeakingRef.current) {
            hasPickedUpRef.current = true;
            engine.play("pickup_click", manifest.defaultVolumes.pickup_click ?? 0.9, false);
          } else {
            engine.play("phone_ring", manifest.defaultVolumes.phone_ring ?? 0.8, true);
          }
        }

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
          data: { storyId, soundProfileId, timelineEvents: manifest.timeline.length },
        });
      } catch (err) {
        logger.error({
          event: "sound.init_failed",
          sessionId,
          causalChain: ["sound.init_start", "sound.init_failed"],
          error: err,
          data: { storyId, soundProfileId },
        });
        initStartedRef.current = false;
      }
    };

    const delayTimer = setTimeout(() => void setup(), INIT_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(delayTimer);
    };
  }, [enableAdaptiveMusic, logger, sessionId, soundOn, soundProfileId, status, storyId, useTheCallStateDirector]);

  useEffect(() => {
    hasPickedUpRef.current = false;
    theCallWaterStageRef.current = 0;
    theCallStateDirectorRef.current?.reset();
    setTheCallDirectorReadyRevision(0);
  }, [soundProfileId, storyId]);

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

  const applyTheCallReactiveLayer = useCallback((engine: SoundEngine, cueId: string) => {
    if (soundProfileId !== "the-call") return;
    if (cueId !== "water_drip") return;

    const stage = theCallWaterStageRef.current;

    if (stage === 0) {
      engine.handleToolCall("water_leak_loop", 0.12, true, 2.5);
      theCallWaterStageRef.current = 1;
      return;
    }

    if (stage === 1) {
      engine.setVolume("water_leak_loop", 0.16, 2);
      engine.handleToolCall("water_rising_loop", 0.16, true, 3);
      theCallWaterStageRef.current = 2;
      return;
    }

    engine.setVolume("water_leak_loop", 0.18, 1.5);
    engine.setVolume("water_rising_loop", 0.22, 1.5);
  }, [soundProfileId]);

  // ── Authoritative tool-call path ───────────────────────────
  useEffect(() => {
    const unsubscribe = onToolCall((toolCall) => {
      const engine = engineRef.current;
      const musicEngine = musicEngineRef.current;

      if (toolCall.name === "trigger_sound" && engine) {
        if (isSoundIdBlocked(soundProfileId, toolCall.args.soundId)) {
          logger.info({
            event: "tool.trigger_sound.blocked",
            sessionId,
            causalChain: extendCausalChain(toolCall.causalChain, "tool.trigger_sound.blocked"),
            data: { soundId: toolCall.args.soundId, storyId, soundProfileId },
          });
          return;
        }
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
  }, [logger, onToolCall, sessionId, soundProfileId, storyId]);

  // ── Reactive narration cues ───────────────────────────
  // "the-call" still needs deterministic cue fallback even in live mode because
  // its authored sound design depends on narration and transcript intent moments.
  useEffect(() => {
    if (!enableReactiveCueFallback) return;
    if (!DEBUG_CONFIG.enableKeywordCueFallback) return;
    if (!lastAiText || status !== "playing") return;
    const engine = engineRef.current;
    if (!engine) return;
    const rules = getTranscriptIntentCueRules(storyId);

    const detectedCueIds = detectNarrativeCueSoundIds(lastAiText, rules);
    if (detectedCueIds.length === 0) return;
    const selection = selectCuesOffCooldown(
      detectedCueIds,
      cueCooldownsRef.current,
      { nowMs: Date.now(), cooldownMs: CUE_COOLDOWN_MS },
    );

    for (const cooledDownCueId of selection.coolingDownCueIds) {
      console.log(`[USE-SOUND] Cue cooldown active for "${cooledDownCueId}" — skipping`);
    }

    for (const cueId of selection.readyCueIds) {
      if (isSoundIdBlocked(soundProfileId, cueId)) {
        logger.info({
          event: "sound.inline_cue.blocked",
          sessionId,
          causalChain: ["sound.inline_cue", "blocked"],
          data: { soundId: cueId, storyId, soundProfileId },
        });
        continue;
      }
      console.log(`[USE-SOUND] Inline cue triggered: "${cueId}"`);
      applyTheCallReactiveLayer(engine, cueId);
      engine.triggerCue(cueId);
    }
  }, [applyTheCallReactiveLayer, enableReactiveCueFallback, lastAiText, logger, sessionId, soundProfileId, status, storyId]);

  // ── Deterministic transcript intent fallback (tool-call aware) ──
  // If no authoritative trigger_sound arrives shortly after a user turn,
  // map transcript intent keywords to a deterministic cue list.
  useEffect(() => {
    if (!enableReactiveCueFallback) return;
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
        if (isSoundIdBlocked(soundProfileId, cueId)) {
          logger.info({
            event: "sound.transcript_fallback.blocked",
            sessionId,
            causalChain: ["sound.transcript_fallback", "blocked"],
            data: { soundId: cueId, storyId, soundProfileId, lastUserTranscriptSeq },
          });
          continue;
        }
        logger.info({
          event: "sound.transcript_fallback.triggered",
          sessionId,
          causalChain: ["sound.transcript_fallback", "triggered"],
          data: { soundId: cueId, storyId, lastUserTranscriptSeq },
        });
        applyTheCallReactiveLayer(engine, cueId);
        engine.triggerCue(cueId);
      }
    }, TRANSCRIPT_INTENT_FALLBACK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [applyTheCallReactiveLayer, enableReactiveCueFallback, lastUserTranscriptSeq, lastUserTranscriptText, logger, sessionId, soundProfileId, status, storyId]);

  function detectMeAndMesAudioEvent(text: string): "threshold_entered" | "ending_reached" | null {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return null;

    if (normalized.includes("ok. now you're going to enter the room.")) {
      return "threshold_entered";
    }

    const looksLikeEnding =
      normalized.includes("the room closes") ||
      normalized.includes("you leave with") ||
      normalized.includes("you are free to fully inhabit your present") ||
      normalized.includes("the room goes quiet") ||
      normalized.includes("integration begins") ||
      normalized.includes("the fragmented parts converge");

    return looksLikeEnding ? "ending_reached" : null;
  }

  // ── Story-specific state-driven audio direction ────────────
  useEffect(() => {
    if (status !== "playing") return;
    const director = audioDirectorRef.current;
    if (!director || soundProfileId !== "me-and-mes") return;

    const event = detectMeAndMesAudioEvent(lastAiText);
    if (!event) return;

    const applied = director.dispatch(event);
    if (!applied) return;

    logger.info({
      event: "sound.audio_director.actions_applied",
      sessionId,
      causalChain: ["sound.audio_director.actions_applied"],
      data: { storyId, soundProfileId, audioEvent: event },
    });
  }, [lastAiText, logger, sessionId, soundProfileId, status, storyId]);

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
    if (!useTheCallStateDirector) return;
    if (status !== "playing") return;
    if (!lastUserTranscriptText.trim()) return;
    const director = theCallStateDirectorRef.current;
    if (!director) return;

    const actions = director.applyUserInstruction(lastUserTranscriptSeq, lastUserTranscriptText);
    if (actions.length === 0) return;

    logger.info({
      event: "sound.the_call_state_director.user_actions_applied",
      sessionId,
      causalChain: ["sound.the_call_state_director", "user_actions_applied"],
      data: {
        storyId,
        transcriptSeq: lastUserTranscriptSeq,
        transcriptText: lastUserTranscriptText,
        actions,
      },
    });
  }, [
    lastUserTranscriptSeq,
    lastUserTranscriptText,
    logger,
    sessionId,
    status,
    storyId,
    theCallDirectorReadyRevision,
    useTheCallStateDirector,
  ]);

  useEffect(() => {
    if (!useTheCallStateDirector) return;
    if (status !== "playing") return;
    if (!lastAiTranscriptText.trim()) return;
    const director = theCallStateDirectorRef.current;
    if (!director) return;

    const actions = director.applyAiNarration(lastAiTranscriptText);
    if (actions.length === 0) return;

    logger.info({
      event: "sound.the_call_state_director.ai_actions_applied",
      sessionId,
      causalChain: ["sound.the_call_state_director", "ai_actions_applied"],
      data: {
        storyId,
        transcriptSeq: lastAiTranscriptSeq,
        transcriptText: lastAiTranscriptText,
        actions,
      },
    });
  }, [
    lastAiTranscriptSeq,
    lastAiTranscriptText,
    logger,
    sessionId,
    status,
    storyId,
    theCallDirectorReadyRevision,
    useTheCallStateDirector,
  ]);

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
      audioDirectorRef.current = null;
      theCallStateDirectorRef.current = null;
      setTheCallDirectorReadyRevision(0);
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
      audioDirectorRef.current = null;
      theCallStateDirectorRef.current = null;
    };
  }, []);

  const stopAll = useCallback(() => {
    engineRef.current?.muteAll(0.5);
  }, []);

  return { stopAll };
}
