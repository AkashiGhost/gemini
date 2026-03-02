// ─────────────────────────────────────────────
// AudioCapture — browser microphone → base64 PCM 16kHz chunks
//
// Uses AudioWorklet (runs on the dedicated audio thread — not the main thread).
// This prevents audio dropouts when React is rendering or other JS is running.
// The worklet is loaded from an inline Blob URL so no separate hosted file is needed.
//
// Downsample from device native rate (usually 44100/48000Hz) → 16kHz in the worklet.
// Sends Float32 chunks to the main thread via postMessage, where they are
// Int16-encoded and base64'd before being sent over WebSocket.
// ─────────────────────────────────────────────

const TARGET_SAMPLE_RATE = 16000;
// ~100ms of audio at 16kHz per chunk — good balance between latency and overhead
const TARGET_CHUNK_SAMPLES = 1600;

// ── Worklet processor code (runs on the audio thread) ──
// Loaded via Blob URL so no extra file needs to be hosted.
const WORKLET_CODE = `
class PCMCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // sampleRate is a global in AudioWorkletGlobalScope
    this._ratio = sampleRate / (options.processorOptions.targetRate || 16000);
    this._targetChunk = options.processorOptions.targetChunk || 1600;
    this._buf = [];
    this._pos = 0; // fractional position for downsampling
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;

    // Downsample: advance by ratio, collect one sample per target sample
    while (this._pos < ch.length) {
      this._buf.push(ch[Math.min(Math.floor(this._pos), ch.length - 1)]);
      this._pos += this._ratio;
    }
    this._pos -= ch.length;

    // Emit full chunks
    while (this._buf.length >= this._targetChunk) {
      const chunk = new Float32Array(this._targetChunk);
      for (let i = 0; i < this._targetChunk; i++) chunk[i] = this._buf[i];
      this._buf.splice(0, this._targetChunk);
      this.port.postMessage(chunk, [chunk.buffer]); // transfer ownership (zero-copy)
    }

    return true; // keep processor alive
  }
}
registerProcessor('pcm-capture', PCMCaptureProcessor);
`;

export type AudioChunkCallback = (base64: string) => void;

export class AudioCapture {
  private onChunk: AudioChunkCallback;
  private stream: MediaStream | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private blobUrl: string | null = null;
  private isActive = false;

  constructor(onChunk: AudioChunkCallback) {
    this.onChunk = onChunk;
  }

  /** Request microphone access and begin capturing audio chunks */
  async start(): Promise<void> {
    if (this.isActive) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Use the browser's native sample rate — the worklet will downsample to 16kHz.
    // Avoids browser-side resampling artifacts from requesting a non-native rate.
    this.audioCtx = new AudioContext();

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    // Load the worklet processor from an inline Blob URL (same-origin — no CORS issues)
    this.blobUrl = URL.createObjectURL(
      new Blob([WORKLET_CODE], { type: "application/javascript" })
    );
    await this.audioCtx.audioWorklet.addModule(this.blobUrl);

    this.sourceNode = this.audioCtx.createMediaStreamSource(this.stream);

    this.workletNode = new AudioWorkletNode(this.audioCtx, "pcm-capture", {
      processorOptions: {
        targetRate: TARGET_SAMPLE_RATE,
        targetChunk: TARGET_CHUNK_SAMPLES,
      },
    });

    // Receive downsampled Float32 chunks from the audio thread
    this.workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
      if (!this.isActive) return;
      const base64 = float32ToBase64Int16(e.data);
      this.onChunk(base64);
    };

    this.sourceNode.connect(this.workletNode);
    // WorkletNode must be connected to destination to keep the audio graph running
    this.workletNode.connect(this.audioCtx.destination);

    this.isActive = true;
  }

  /** Stop capturing and release microphone */
  stop(): void {
    if (!this.isActive) return;
    this.isActive = false;

    this.workletNode?.disconnect();
    this.sourceNode?.disconnect();

    for (const track of this.stream?.getTracks() ?? []) {
      track.stop();
    }

    this.audioCtx?.close();

    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }

    this.workletNode = null;
    this.sourceNode = null;
    this.stream = null;
    this.audioCtx = null;
  }
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Convert Float32 PCM [-1, 1] → Int16 PCM → base64 string */
function float32ToBase64Int16(float32: Float32Array): string {
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // Uint8Array view → binary string → base64
  const uint8 = new Uint8Array(int16.buffer);
  let binary = "";
  // Use chunk-based string building to avoid call stack overflow on large buffers
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
