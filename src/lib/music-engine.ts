import { GoogleGenAI, Modality, type LiveServerMessage, type Session } from "@google/genai";
import { clampTension, createLyriaConfig, type LyriaConfig } from "@/lib/config/lyria";

export interface MusicEngineOptions {
  audioContext: AudioContext;
  gainNode: GainNode;
  config?: Partial<LyriaConfig>;
}

interface LyriaTokenResponse {
  token: string;
}

interface LyriaErrorResponse {
  error: string;
}

interface MusicLogPayload {
  event: string;
  [key: string]: unknown;
}

export class MusicEngine {
  private readonly audioContext: AudioContext;
  private readonly gainNode: GainNode;
  private readonly config: LyriaConfig;

  private ai: GoogleGenAI | null = null;
  private session: Session | null = null;
  private reconnectCount = 0;
  private destroyed = false;
  private paused = false;
  private shouldReconnect = true;
  private pendingStartTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private currentTension: number;

  constructor(options: MusicEngineOptions) {
    this.audioContext = options.audioContext;
    this.gainNode = options.gainNode;
    this.config = createLyriaConfig(options.config);
    this.currentTension = this.config.initialTension;
    this.gainNode.gain.value = 0;
  }

  async connect(): Promise<boolean> {
    if (this.destroyed) {
      this.log("warn", { event: "connect_skipped", reason: "engine_destroyed" });
      return false;
    }
    if (this.session) {
      this.log("info", { event: "connect_skipped", reason: "already_connected" });
      return true;
    }

    const connected = await this.connectInternal(false);
    if (!connected) return false;

    await this.updateTension(this.currentTension, this.config.transitionSeconds);
    this.setGain(this.paused ? 0 : this.config.baseGain, this.config.transitionSeconds);
    return true;
  }

  async updateTension(nextTension: number, transitionSeconds = this.config.transitionSeconds): Promise<void> {
    this.currentTension = clampTension(nextTension, this.currentTension);

    if (!this.session || this.destroyed) {
      this.log("warn", {
        event: "tension_update_skipped",
        reason: this.destroyed ? "engine_destroyed" : "session_unavailable",
        tension: this.currentTension,
      });
      return;
    }

    const direction = tensionDirection(this.currentTension);
    const prompt = [
      `Set soundtrack tension to ${this.currentTension.toFixed(2)} on a 0-1 scale.`,
      `Direction: ${direction}.`,
      "Keep it instrumental, cinematic, and seamless with no sudden stops.",
    ].join(" ");

    try {
      this.session.sendClientContent({
        turns: prompt,
        turnComplete: true,
      });
      this.log("info", {
        event: "tension_updated",
        tension: this.currentTension,
        direction,
        transitionSeconds,
      });
    } catch (error: unknown) {
      this.log("warn", {
        event: "tension_update_failed",
        tension: this.currentTension,
        message: errorMessage(error),
      });
    }
  }

  pause(): void {
    if (this.destroyed || this.paused) return;
    this.paused = true;
    this.clearActiveSources();
    this.pendingStartTime = 0;
    this.setGain(0, this.config.transitionSeconds);
    this.log("info", { event: "paused" });
  }

  resume(): void {
    if (this.destroyed || !this.paused) return;
    this.paused = false;
    this.setGain(this.config.baseGain, this.config.transitionSeconds);
    this.log("info", { event: "resumed" });
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.shouldReconnect = false;
    this.clearActiveSources();
    this.pendingStartTime = 0;
    this.session?.close();
    this.session = null;
    this.ai = null;
    this.setGain(0, 0);
    this.log("info", { event: "destroyed" });
  }

  private async connectInternal(isReconnect: boolean): Promise<boolean> {
    const token = await this.fetchToken();
    if (!token) return false;

    try {
      this.ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      } as ConstructorParameters<typeof GoogleGenAI>[0]);

      this.shouldReconnect = true;
      this.session = await this.ai.live.connect({
        model: this.config.model,
        config: {
          responseModalities: [Modality.AUDIO],
        },
        callbacks: {
          onopen: () => {
            this.log("info", {
              event: isReconnect ? "reconnected" : "connected",
              model: this.config.model,
            });
          },
          onmessage: (message: LiveServerMessage) => {
            this.handleMessage(message);
          },
          onerror: (event: ErrorEvent) => {
            this.log("warn", {
              event: "session_error",
              message: event.message || "Lyria live session error",
            });
          },
          onclose: (event: CloseEvent) => {
            this.handleSessionClose(event);
          },
        },
      });

      this.reconnectCount = 0;
      return true;
    } catch (error: unknown) {
      this.session = null;
      this.ai = null;
      this.log("error", {
        event: isReconnect ? "reconnect_failed" : "connect_failed",
        message: errorMessage(error),
      });
      return false;
    }
  }

  private async fetchToken(): Promise<string | null> {
    try {
      const response = await fetch(this.config.tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });

      const payload = await parseJsonResponse(response);
      if (!response.ok) {
        const error =
          isLyriaErrorResponse(payload) && payload.error.trim().length > 0
            ? payload.error
            : `Token endpoint failed with status ${response.status}`;
        this.log("error", { event: "token_request_failed", status: response.status, error });
        return null;
      }

      if (!isLyriaTokenResponse(payload) || payload.token.trim().length === 0) {
        this.log("error", { event: "token_response_invalid" });
        return null;
      }

      return payload.token;
    } catch (error: unknown) {
      this.log("error", { event: "token_fetch_error", message: errorMessage(error) });
      return null;
    }
  }

  private handleSessionClose(event: CloseEvent): void {
    this.log("warn", {
      event: "session_closed",
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });

    this.session = null;
    this.ai = null;
    this.clearActiveSources();
    this.pendingStartTime = 0;

    if (!this.shouldReconnect || this.destroyed) return;
    if (this.reconnectCount >= this.config.reconnectAttempts) {
      this.log("error", {
        event: "reconnect_exhausted",
        attempts: this.reconnectCount,
      });
      return;
    }

    this.reconnectCount += 1;
    this.log("info", {
      event: "reconnect_attempt",
      attempt: this.reconnectCount,
      maxAttempts: this.config.reconnectAttempts,
    });

    void this.connectInternal(true).then((connected) => {
      if (!connected || this.destroyed) return;
      this.setGain(this.paused ? 0 : this.config.baseGain, this.config.transitionSeconds);
      void this.updateTension(this.currentTension, this.config.transitionSeconds);
    });
  }

  private handleMessage(message: LiveServerMessage): void {
    if (this.destroyed || this.paused) return;

    if (message.serverContent?.interrupted) {
      this.clearActiveSources();
      this.pendingStartTime = 0;
      this.log("info", { event: "audio_interrupted" });
    }

    const parts = message.serverContent?.modelTurn?.parts ?? [];
    for (const part of parts) {
      const inlineData = part.inlineData;
      if (!inlineData?.data) continue;
      void this.playInlineAudioChunk(inlineData.data, inlineData.mimeType);
    }
  }

  private async playInlineAudioChunk(base64Data: string, mimeType?: string): Promise<void> {
    const audioBuffer = await this.decodeInlineAudio(base64Data, mimeType);
    if (!audioBuffer || this.destroyed || this.paused) return;

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);

    const startAt = Math.max(this.audioContext.currentTime, this.pendingStartTime);
    source.start(startAt);
    this.pendingStartTime = startAt + audioBuffer.duration;
    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };
  }

  private async decodeInlineAudio(base64Data: string, mimeType?: string): Promise<AudioBuffer | null> {
    const bytes = base64ToBytes(base64Data);
    if (!bytes) {
      this.log("warn", { event: "audio_decode_failed", reason: "invalid_base64" });
      return null;
    }

    try {
      const encodedCopy = new Uint8Array(bytes.byteLength);
      encodedCopy.set(bytes);
      return await this.audioContext.decodeAudioData(encodedCopy.buffer);
    } catch {
      const sampleRate = parseSampleRate(mimeType) ?? this.config.fallbackSampleRate;
      return decodePcm16(this.audioContext, bytes, sampleRate);
    }
  }

  private setGain(target: number, transitionSeconds: number): void {
    const now = this.audioContext.currentTime;
    const clampedTarget = Math.min(1, Math.max(0, target));
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, now);
    if (transitionSeconds <= 0) {
      this.gainNode.gain.setValueAtTime(clampedTarget, now);
      return;
    }
    this.gainNode.gain.linearRampToValueAtTime(clampedTarget, now + transitionSeconds);
  }

  private clearActiveSources(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // no-op: source may already be ended
      }
    }
    this.activeSources.clear();
  }

  private log(level: "info" | "warn" | "error", payload: MusicLogPayload): void {
    const data = { scope: "music_engine", ...payload };
    if (level === "info") console.log("[MusicEngine]", data);
    if (level === "warn") console.warn("[MusicEngine]", data);
    if (level === "error") console.error("[MusicEngine]", data);
  }
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isLyriaTokenResponse(value: unknown): value is LyriaTokenResponse {
  if (!value || typeof value !== "object") return false;
  return typeof (value as Partial<LyriaTokenResponse>).token === "string";
}

function isLyriaErrorResponse(value: unknown): value is LyriaErrorResponse {
  if (!value || typeof value !== "object") return false;
  return typeof (value as Partial<LyriaErrorResponse>).error === "string";
}

function base64ToBytes(base64: string): Uint8Array | null {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function decodePcm16(
  audioContext: AudioContext,
  bytes: Uint8Array,
  sampleRate: number,
): AudioBuffer {
  const frameCount = Math.floor(bytes.byteLength / 2);
  const buffer = audioContext.createBuffer(1, frameCount, sampleRate);
  const channel = buffer.getChannelData(0);
  const view = new DataView(bytes.buffer, bytes.byteOffset, frameCount * 2);

  for (let i = 0; i < frameCount; i++) {
    channel[i] = view.getInt16(i * 2, true) / 32768;
  }

  return buffer;
}

function parseSampleRate(mimeType?: string): number | null {
  if (!mimeType) return null;
  const rateMatch = mimeType.match(/rate=(\d+)/i);
  if (!rateMatch) return null;
  const rate = Number(rateMatch[1]);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function tensionDirection(tension: number): string {
  if (tension >= 0.8) return "high urgency, dense percussion, dramatic movement";
  if (tension >= 0.55) return "rising tension, deeper low-end, subtle rhythmic pulse";
  if (tension >= 0.3) return "steady suspense, textured pads, restrained motion";
  return "calm atmosphere, minimal pulse, sparse cinematic ambience";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message;
  return "Unknown error";
}
