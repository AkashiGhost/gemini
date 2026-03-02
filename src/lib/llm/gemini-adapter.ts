// ─────────────────────────────────────────────
// Gemini Adapter — Live API for voice + Flash Lite for intent
// Implements StoryEngine and IntentParser interfaces
// ─────────────────────────────────────────────

import { GoogleGenAI, Modality } from "@google/genai";
import type { LiveServerMessage, Session } from "@google/genai";
import type { StoryEngine, IntentParser, LLMTurn } from "../types/llm";
import type { IntentResult, IntentType, EmotionalRegister, ChallengeLevel } from "../types/intent";

// ─────────────────────────────────────────────
// Gemini Story Engine (Live API — voice + text)
// ─────────────────────────────────────────────

export class GeminiStoryEngine implements StoryEngine {
  private ai: GoogleGenAI;
  private session: Session | null = null;
  private responseQueue: LiveServerMessage[] = [];
  private voiceName: string;

  constructor(apiKey: string, voiceName = "Aoede") {
    // v1alpha unlocks affective dialog + proactive audio
    this.ai = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" } as ConstructorParameters<typeof GoogleGenAI>[0]);
    this.voiceName = voiceName;
  }

  async initialize(systemPrompt: string, voice?: string): Promise<void> {
    if (voice) this.voiceName = voice;

    this.session = await this.ai.live.connect({
      model: "gemini-2.5-flash-native-audio-latest",
      callbacks: {
        onopen: () => {
          console.log("[Gemini Live] Session opened");
        },
        onmessage: (message: LiveServerMessage) => {
          this.responseQueue.push(message);
        },
        onerror: (e: ErrorEvent) => {
          console.error("[Gemini Live] Error:", e.message);
        },
        onclose: (e: CloseEvent) => {
          console.log("[Gemini Live] Session closed:", e.reason);
          this.session = null; // Mark as dead so generateResponse throws immediately
        },
      },
      config: {
        responseModalities: [Modality.AUDIO, Modality.TEXT],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: this.voiceName },
          },
        },
        systemInstruction: { parts: [{ text: systemPrompt }] },

        // ── Session stability ───────────────────────────────────────
        // Prevents hard 15-min session disconnect by compressing old context
        contextWindowCompression: {
          triggerTokens: 25600,
          slidingWindow: { targetTokens: 12800 },
        },

        // ── Voice Activity Detection ────────────────────────────────
        // LOW end-of-speech sensitivity: Elara waits longer before cutting off
        // player — important for therapy dialogue with natural pauses
        realtimeInputConfig: {
          automaticActivityDetection: {
            endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
            silenceDurationMs: 1200,
          },
        },

        // ── Affective dialog + proactive audio (v1alpha) ────────────
        // Adapts voice/style to player's emotional tone; ignores background noise
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(({ enableAffectiveDialog: true, proactivity: { proactiveAudio: true } }) as any),
      } as Record<string, unknown>,
    });

    // No keepalive needed: Cloud Run timeout is 3600s, game is 10-12 min.
    // Silent PCM keepalive would trigger Gemini VAD and interfere with voice detection.
  }

  async generateResponse(
    playerText: string,
    stateSnapshot: Record<string, unknown>,
  ): Promise<LLMTurn> {
    if (!this.session) throw new Error("Gemini session not initialized");

    // Clear queue before sending
    this.responseQueue = [];

    // Include state context in the message
    const contextPrefix = `[State: phase=${stateSnapshot.phase_id}, trust=${stateSnapshot.trust_level}, elapsed=${stateSnapshot.elapsed_seconds}s]\n`;

    this.session.sendClientContent({
      turns: contextPrefix + playerText,
      turnComplete: true,
    });

    // Collect response until turn complete
    const turn = await this.collectTurn();
    return turn;
  }

  async *generateAudioResponse(
    audioChunk: ArrayBuffer,
    stateSnapshot: Record<string, unknown>,
  ): AsyncGenerator<LLMTurn> {
    if (!this.session) throw new Error("Gemini session not initialized");

    // Clear queue
    this.responseQueue = [];

    // Send audio chunk
    const base64 = Buffer.from(audioChunk).toString("base64");
    this.session.sendRealtimeInput({
      audio: {
        data: base64,
        mimeType: "audio/pcm;rate=16000",
      },
    });

    // Yield partial responses as they arrive
    let turnComplete = false;
    while (!turnComplete) {
      const message = await this.waitForMessage();
      if (!message) break; // Timeout — no more messages expected

      if (message.serverContent?.turnComplete) {
        turnComplete = true;
      }

      // Handle barge-in: user spoke while Elara was talking
      if ((message.serverContent as Record<string, unknown>)?.interrupted) {
        yield { text: "", isFallback: false, interrupted: true };
        return;
      }

      // Handle tool calls (sound cues triggered by model)
      if (message.toolCall) {
        for (const fc of message.toolCall.functionCalls ?? []) {
          if (fc.name === "trigger_sound_cue") {
            // Respond immediately so model continues
            this.session.sendToolResponse({
              functionResponses: [
                { id: fc.id, name: fc.name, response: { result: "ok" } },
              ],
            });

            // Yield as a sound cue marker in text
            yield {
              text: `[SOUND:${(fc.args as Record<string, string>)?.sound_id}]`,
              isFallback: false,
            };
          }
        }
        continue;
      }

      // Extract text and audio from model turn
      const parts = message.serverContent?.modelTurn?.parts ?? [];
      let text = "";
      const audioChunks: ArrayBuffer[] = [];

      // Audio is in part.inlineData.data — do NOT also read message.data (same bytes)
      for (const part of parts) {
        if ((part as Record<string, unknown>).thought) continue; // skip internal thinking
        if (part.text) {
          text += part.text;
        }
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          audioChunks.push(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
        }
      }

      if (text || audioChunks.length > 0) {
        yield { text, audioChunks, isFallback: false };
      }
    }
  }

  async destroy(): Promise<void> {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
  }

  // ─── Internal helpers ───

  private async waitForMessage(): Promise<LiveServerMessage | undefined> {
    // Poll the queue with a timeout
    const maxWait = 30_000; // 30s timeout
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      const message = this.responseQueue.shift();
      if (message) return message;
      await new Promise((r) => setTimeout(r, 50));
    }

    return undefined;
  }

  private async collectTurn(): Promise<LLMTurn> {
    let fullText = "";
    const allAudioChunks: ArrayBuffer[] = [];
    let turnComplete = false;
    const maxWait = 30_000;
    const start = Date.now();

    while (!turnComplete && Date.now() - start < maxWait) {
      const message = this.responseQueue.shift();

      if (!message) {
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }

      if (message.serverContent?.turnComplete) {
        turnComplete = true;
      }

      // Handle tool calls
      if (message.toolCall && this.session) {
        for (const fc of message.toolCall.functionCalls ?? []) {
          if (fc.name === "trigger_sound_cue") {
            this.session.sendToolResponse({
              functionResponses: [
                { id: fc.id, name: fc.name, response: { result: "ok" } },
              ],
            });
            fullText += `[SOUND:${(fc.args as Record<string, string>)?.sound_id}]`;
          }
        }
        continue;
      }

      // Extract content — audio comes via part.inlineData.data (do NOT also read
      // message.data, which is the same bytes re-exposed by the SDK shorthand)
      const parts = message.serverContent?.modelTurn?.parts ?? [];
      for (const part of parts) {
        if ((part as Record<string, unknown>).thought) continue; // skip internal thinking
        if (part.text) fullText += part.text;
        if (part.inlineData?.data) {
          const buffer = Buffer.from(part.inlineData.data, "base64");
          allAudioChunks.push(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
        }
      }
    }

    return {
      text: fullText,
      audioChunks: allAudioChunks.length > 0 ? allAudioChunks : undefined,
      isFallback: false,
    };
  }
}

// ─────────────────────────────────────────────
// Gemini Intent Parser (Flash Lite — fast + cheap)
// ─────────────────────────────────────────────

export class GeminiIntentParser implements IntentParser {
  private ai: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model = "gemini-2.0-flash-lite") {
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async parse(playerText: string): Promise<IntentResult> {
    const prompt = `You are an intent classifier for a voice-based horror therapy game.
The player is a therapist speaking to a patient named Elara.

Classify the following player input. Return ONLY valid JSON, no markdown.

Player said: "${playerText}"

Return JSON:
{
  "intent": one of ["speak_to_elara","ask_question","express_emotion","try_to_leave","try_phone","try_call_help","try_end_session","stand_up","look_around","silence","other"],
  "emotionalRegister": one of ["empathetic","analytical","nurturing","confrontational","neutral"],
  "keyPhrase": the most significant phrase from the input,
  "challengeLevel": one of ["low","medium","high"]
}`;

    try {
      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const text = response.text?.trim() ?? "";

      // Strip markdown code fences if present
      const jsonStr = text.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
      const parsed = JSON.parse(jsonStr);

      return {
        intent: (parsed.intent as IntentType) ?? "other",
        emotionalRegister: (parsed.emotionalRegister as EmotionalRegister) ?? "neutral",
        keyPhrase: (parsed.keyPhrase as string) ?? playerText,
        challengeLevel: (parsed.challengeLevel as ChallengeLevel) ?? "medium",
        rawInput: playerText,
      };
    } catch (err) {
      console.warn("[GeminiIntentParser] Failed to parse:", err);
      return {
        intent: "speak_to_elara",
        emotionalRegister: "neutral",
        keyPhrase: playerText,
        challengeLevel: "medium",
        rawInput: playerText,
      };
    }
  }
}
