// ─────────────────────────────────────────────
// Sound Engine — Client-side Web Audio API
// Manages ambient loops, crossfades, timeline events,
// hard stops, TTS ducking, and spatial panning.
// ─────────────────────────────────────────────

export interface SoundChannel {
  id: string;
  buffer: AudioBuffer | null;
  source: AudioBufferSourceNode | null;
  gainNode: GainNode;
  panNode: StereoPannerNode;
  isPlaying: boolean;
  isLooping: boolean;
  baseVolume: number;
}

export interface TimelineEvent {
  time: number; // seconds from game start
  action: string;
  soundId?: string;
  soundIds?: string[];
  fadeDurationSeconds?: number;
  fadeInSeconds?: number;
  targetVolume?: number;
  condition?: string | null;
  restoreVolumes?: Record<string, number>;
}

export interface SoundEngineConfig {
  ttsDucking: {
    reductionDb: number;
    fadeInMs: number;
    fadeOutMs: number;
  };
  crossfadeDefaultMs: number;
  spatialMap: Record<string, { pan: number }>;
  preloadOrder: string[];
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private channels = new Map<string, SoundChannel>();
  private bufferCache = new Map<string, AudioBuffer>();
  private timeline: TimelineEvent[] = [];
  private timelineTimer: ReturnType<typeof setInterval> | null = null;
  private startTime = 0;
  private firedEvents = new Set<number>();
  private config: SoundEngineConfig;
  private isDucking = false;

  constructor(config: SoundEngineConfig) {
    this.config = config;
  }

  /** Initialize audio context (must be called after user gesture) */
  async init(): Promise<void> {
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);

    // Resume if suspended (browser autoplay policy)
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  /** Preload audio assets */
  async preload(assets: Array<{ id: string; url: string }>): Promise<void> {
    if (!this.ctx) throw new Error("SoundEngine not initialized");

    const promises = assets.map(async ({ id, url }) => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
        this.bufferCache.set(id, audioBuffer);
      } catch {
        console.warn(`Failed to preload: ${id} (${url})`);
      }
    });

    await Promise.allSettled(promises);
  }

  /** Create a channel for a sound */
  private getOrCreateChannel(id: string): SoundChannel {
    if (this.channels.has(id)) return this.channels.get(id)!;
    if (!this.ctx || !this.masterGain) throw new Error("Not initialized");

    const gainNode = this.ctx.createGain();
    const panNode = this.ctx.createStereoPanner();

    panNode.connect(gainNode);
    gainNode.connect(this.masterGain);

    // Set spatial position from config
    const spatial = this.config.spatialMap[id];
    if (spatial) {
      panNode.pan.value = spatial.pan;
    }

    const channel: SoundChannel = {
      id,
      buffer: this.bufferCache.get(id) ?? null,
      source: null,
      gainNode,
      panNode,
      isPlaying: false,
      isLooping: false,
      baseVolume: 0,
    };

    this.channels.set(id, channel);
    return channel;
  }

  /** Start playing a sound (loop or one-shot) */
  play(id: string, volume: number, loop: boolean, fadeInSeconds = 0): void {
    if (!this.ctx) return;

    const channel = this.getOrCreateChannel(id);
    const buffer = this.bufferCache.get(id);

    // Stop existing source if playing
    if (channel.source && channel.isPlaying) {
      try { channel.source.stop(); } catch { /* already stopped */ }
    }

    channel.baseVolume = volume;
    channel.isLooping = loop;

    if (!buffer) {
      // No buffer loaded — mark as playing for state tracking
      channel.isPlaying = true;
      channel.gainNode.gain.value = 0;
      return;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    source.connect(channel.panNode);

    if (fadeInSeconds > 0) {
      channel.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      channel.gainNode.gain.linearRampToValueAtTime(
        volume,
        this.ctx.currentTime + fadeInSeconds,
      );
    } else {
      channel.gainNode.gain.value = volume;
    }

    source.start(0);
    channel.source = source;
    channel.isPlaying = true;

    source.onended = () => {
      if (!loop) {
        channel.isPlaying = false;
      }
    };
  }

  /** Stop a sound with optional fade */
  stop(id: string, fadeDurationSeconds = 0): void {
    if (!this.ctx) return;
    const channel = this.channels.get(id);
    if (!channel || !channel.isPlaying) return;

    if (fadeDurationSeconds > 0) {
      channel.gainNode.gain.linearRampToValueAtTime(
        0,
        this.ctx.currentTime + fadeDurationSeconds,
      );
      // Schedule stop after fade
      setTimeout(() => {
        try { channel.source?.stop(); } catch { /* already stopped */ }
        channel.isPlaying = false;
      }, fadeDurationSeconds * 1000 + 50);
    } else {
      // HARD STOP — instant, no ramp (critical for clock stop at 7:00)
      channel.gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
      try { channel.source?.stop(); } catch { /* already stopped */ }
      channel.isPlaying = false;
    }
  }

  /** Adjust volume of a playing sound */
  setVolume(id: string, targetVolume: number, fadeDurationSeconds = 0): void {
    if (!this.ctx) return;
    const channel = this.channels.get(id);
    if (!channel) return;

    channel.baseVolume = targetVolume;

    if (fadeDurationSeconds > 0) {
      channel.gainNode.gain.linearRampToValueAtTime(
        targetVolume,
        this.ctx.currentTime + fadeDurationSeconds,
      );
    } else {
      channel.gainNode.gain.value = targetVolume;
    }
  }

  /** Mute ALL channels */
  muteAll(fadeDurationSeconds = 0.5): void {
    if (!this.ctx) return;

    for (const channel of this.channels.values()) {
      if (channel.isPlaying) {
        channel.gainNode.gain.linearRampToValueAtTime(
          0,
          this.ctx.currentTime + fadeDurationSeconds,
        );
      }
    }

    // Stop all sources after fade
    setTimeout(() => {
      for (const channel of this.channels.values()) {
        try { channel.source?.stop(); } catch { /* already stopped */ }
        channel.isPlaying = false;
      }
    }, fadeDurationSeconds * 1000 + 50);
  }

  /** Restore all channels to their base volumes */
  restoreAll(volumes: Record<string, number>, fadeInSeconds = 2): void {
    for (const [id, volume] of Object.entries(volumes)) {
      this.play(id, volume, true, fadeInSeconds);
    }
  }

  /** Fade all sounds to nothing */
  fadeAllToNothing(fadeDurationSeconds = 30): void {
    if (!this.ctx) return;

    for (const channel of this.channels.values()) {
      if (channel.isPlaying) {
        channel.gainNode.gain.linearRampToValueAtTime(
          0,
          this.ctx.currentTime + fadeDurationSeconds,
        );
      }
    }

    setTimeout(() => {
      for (const channel of this.channels.values()) {
        try { channel.source?.stop(); } catch { /* already stopped */ }
        channel.isPlaying = false;
      }
    }, fadeDurationSeconds * 1000 + 50);
  }

  // ─────────────────────────────────────────────
  // TTS Ducking
  // ─────────────────────────────────────────────

  /** Duck ambient sounds when TTS starts */
  startDucking(): void {
    if (!this.ctx || this.isDucking) return;
    this.isDucking = true;

    const { reductionDb, fadeInMs } = this.config.ttsDucking;
    const reductionMultiplier = Math.pow(10, reductionDb / 20); // dB to linear

    for (const channel of this.channels.values()) {
      if (channel.isPlaying) {
        channel.gainNode.gain.linearRampToValueAtTime(
          channel.baseVolume * reductionMultiplier,
          this.ctx.currentTime + fadeInMs / 1000,
        );
      }
    }
  }

  /** Restore ambient sounds after TTS ends */
  stopDucking(): void {
    if (!this.ctx || !this.isDucking) return;
    this.isDucking = false;

    const { fadeOutMs } = this.config.ttsDucking;

    for (const channel of this.channels.values()) {
      if (channel.isPlaying) {
        channel.gainNode.gain.linearRampToValueAtTime(
          channel.baseVolume,
          this.ctx.currentTime + fadeOutMs / 1000,
        );
      }
    }
  }

  // ─────────────────────────────────────────────
  // Timeline executor
  // ─────────────────────────────────────────────

  /** Set and start the deterministic timeline */
  startTimeline(
    events: TimelineEvent[],
    getGameState?: () => Record<string, unknown>,
  ): void {
    this.timeline = events;
    this.startTime = Date.now();
    this.firedEvents.clear();

    this.timelineTimer = setInterval(() => {
      const elapsed = (Date.now() - this.startTime) / 1000;

      for (let i = 0; i < this.timeline.length; i++) {
        if (this.firedEvents.has(i)) continue;

        const event = this.timeline[i];
        if (elapsed >= event.time) {
          // Check condition if present
          if (event.condition && getGameState) {
            const state = getGameState();
            if (!evaluateCondition(event.condition, state)) continue;
          }

          this.firedEvents.add(i);
          this.executeTimelineEvent(event);
        }
      }
    }, 100); // Check 10x per second
  }

  /** Stop the timeline executor */
  stopTimeline(): void {
    if (this.timelineTimer) {
      clearInterval(this.timelineTimer);
      this.timelineTimer = null;
    }
  }

  private executeTimelineEvent(event: TimelineEvent): void {
    const ids = event.soundIds ?? (event.soundId ? [event.soundId] : []);

    switch (event.action) {
      case "start_ambient":
      case "start_loop":
        for (const id of ids) {
          this.play(id, this.getDefaultVolume(id), true, event.fadeInSeconds ?? 0);
        }
        break;

      case "start_intermittent":
        for (const id of ids) {
          this.play(id, this.getDefaultVolume(id), false, event.fadeInSeconds ?? 0);
        }
        break;

      case "fade_in":
        for (const id of ids) {
          this.play(
            id,
            this.getDefaultVolume(id),
            true,
            event.fadeInSeconds ?? 3,
          );
        }
        break;

      case "fade_out":
        for (const id of ids) {
          this.stop(id, event.fadeDurationSeconds ?? 2);
        }
        break;

      case "hard_stop":
        for (const id of ids) {
          this.stop(id, 0); // Zero fade — instant
        }
        break;

      case "volume_adjust":
        for (const id of ids) {
          this.setVolume(
            id,
            event.targetVolume ?? 0.5,
            event.fadeDurationSeconds ?? 2,
          );
        }
        break;

      case "mute_all":
        this.muteAll(event.fadeDurationSeconds ?? 0.5);
        break;

      case "restore_all_channels":
        if (event.restoreVolumes) {
          this.restoreAll(event.restoreVolumes, event.fadeInSeconds ?? 2);
        }
        break;

      case "fade_all_to_nothing":
        this.fadeAllToNothing(event.fadeDurationSeconds ?? 30);
        break;

      case "play_once":
        for (const id of ids) {
          this.play(id, this.getDefaultVolume(id), false, event.fadeInSeconds ?? 0);
        }
        break;
    }
  }

  private getDefaultVolume(id: string): number {
    const channel = this.channels.get(id);
    return channel?.baseVolume ?? 0.5;
  }

  /** Trigger a single sound cue (from LLM response) */
  triggerCue(soundId: string, volume = 0.5): void {
    this.play(soundId, volume, false);
  }

  /** Destroy engine and release resources */
  destroy(): void {
    this.stopTimeline();
    for (const channel of this.channels.values()) {
      try { channel.source?.stop(); } catch { /* already stopped */ }
    }
    this.channels.clear();
    this.bufferCache.clear();
    this.ctx?.close();
    this.ctx = null;
  }
}

// ─────────────────────────────────────────────
// Condition evaluator for timeline events
// ─────────────────────────────────────────────

function evaluateCondition(
  condition: string,
  state: Record<string, unknown>,
): boolean {
  // Simple condition parser: "game_state.ending_id == 'integration'"
  const match = condition.match(
    /game_state\.(\w+)\s*==\s*'([^']+)'/,
  );
  if (match) {
    const [, key, expected] = match;
    return state[key] === expected;
  }

  // Fallback: always true
  return true;
}
