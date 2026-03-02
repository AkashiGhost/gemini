// ─────────────────────────────────────────────
// AudioPlayback — base64 PCM 24kHz → gapless Web Audio playback
//
// Decodes incoming base64 Int16 PCM at 24kHz into Float32,
// wraps in AudioBufferSourceNode, and schedules buffers ahead of
// the current playhead so there are no gaps between chunks.
// ─────────────────────────────────────────────

const PLAYBACK_SAMPLE_RATE = 24000;

export class AudioPlayback {
  private audioCtx: AudioContext | null = null;
  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];

  /** Ensure AudioContext is initialized (call after a user gesture) */
  private ensureContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      this.audioCtx = new AudioContext({ sampleRate: PLAYBACK_SAMPLE_RATE });
      this.nextStartTime = 0;
    }
    return this.audioCtx;
  }

  /**
   * Decode a base64 Int16 PCM chunk and schedule it for gapless playback.
   * Safe to call multiple times in rapid succession — buffers are queued.
   */
  play(base64: string): void {
    const ctx = this.ensureContext();

    // Resume if browser suspended the context (autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => undefined);
    }

    const float32 = base64Int16ToFloat32(base64);
    if (float32.length === 0) return;

    const audioBuffer = ctx.createBuffer(
      1, // mono
      float32.length,
      PLAYBACK_SAMPLE_RATE,
    );
    // Ensure the Float32Array is backed by a plain ArrayBuffer (not SharedArrayBuffer)
    const channelData = audioBuffer.getChannelData(0);
    channelData.set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // Schedule immediately or after previous chunk ends — whichever is later
    const startAt = Math.max(ctx.currentTime, this.nextStartTime);
    source.start(startAt);

    this.nextStartTime = startAt + audioBuffer.duration;
    this.activeSources.push(source);

    // Clean up finished sources to avoid memory accumulation
    source.onended = () => {
      const idx = this.activeSources.indexOf(source);
      if (idx !== -1) this.activeSources.splice(idx, 1);
    };
  }

  /**
   * Stop all playing audio and reset the playhead to now.
   * Call this when starting a new session after a reconnect so that
   * stale nextStartTime (from a previous session) doesn't delay new audio.
   */
  reset(): void {
    this.stop();
    // nextStartTime is already reset to 0 by stop() — next play() will
    // use ctx.currentTime which is correct regardless of how much time has passed.
  }

  /**
   * Stop all queued and playing audio immediately.
   * Resets the playhead so the next play() starts fresh.
   */
  stop(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // Already stopped — safe to ignore
      }
    }
    this.activeSources = [];
    this.nextStartTime = 0;
  }

  /** Release the AudioContext entirely */
  destroy(): void {
    this.stop();
    this.audioCtx?.close();
    this.audioCtx = null;
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Decode base64 Int16 PCM → Float32Array [-1, 1] */
function base64Int16ToFloat32(base64: string): Float32Array {
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    console.warn("[AudioPlayback] Invalid base64 chunk — skipping");
    return new Float32Array(0);
  }

  const uint8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8[i] = binary.charCodeAt(i);
  }

  const int16 = new Int16Array(uint8.buffer);
  const float32 = new Float32Array(int16.length);

  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }

  return float32;
}
