"use client";

// ─────────────────────────────────────────────
// GameContext — Gemini Live API implementation
//
// Architecture: Ephemeral token pattern
//   Browser → POST /api/live-token (gets short-lived token)
//   Browser → Gemini Live WebSocket directly (using ephemeral token)
//
// No WS proxy server needed. All audio I/O handled here.
// ─────────────────────────────────────────────

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import type { Session } from "@google/genai";
import { AudioCapture } from "@/lib/audio-capture";
import { AudioPlayback } from "@/lib/audio-playback";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface TranscriptEntry {
  source: "user" | "ai";
  text: string;
}

export interface GameContextValue {
  phase: number;
  status: "idle" | "connecting" | "playing" | "ended" | "error";
  isSpeaking: boolean;
  isPaused: boolean;
  transcript: TranscriptEntry[];
  hasAiSpoken: boolean;
  lastAiText: string;
  micMuted: boolean;
  elapsedSeconds: number;
  errorMessage: string | undefined;
  startSession: (storyId: string) => Promise<void>;
  endSession: () => void;
  togglePause: () => void;
  toggleMicMute: () => void;
}

// ─────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────

type UIState = {
  phase: number;
  status: "idle" | "connecting" | "playing" | "ended" | "error";
  isSpeaking: boolean;
  isPaused: boolean;
  transcript: TranscriptEntry[];
  hasAiSpoken: boolean;
  lastAiText: string;
  micMuted: boolean;
  elapsedSeconds: number;
  errorMessage: string | undefined;
};

type UIAction =
  | { type: "SET_STATUS"; status: UIState["status"]; errorMessage?: string }
  | { type: "SET_SPEAKING"; value: boolean }
  | { type: "AI_TEXT"; text: string }
  | { type: "ADD_TRANSCRIPT"; entry: TranscriptEntry }
  | { type: "GAME_OVER" }
  | { type: "TICK" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SET_MIC_MUTED"; value: boolean }
  | { type: "SET_PHASE"; phase: number };

const initialState: UIState = {
  phase: 0,
  status: "idle",
  isSpeaking: false,
  isPaused: false,
  transcript: [],
  hasAiSpoken: false,
  lastAiText: "",
  micMuted: false,
  elapsedSeconds: 0,
  errorMessage: undefined,
};

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_STATUS":
      // Guard: never overwrite "ended" with "idle" (e.g. from a stale cleanup path)
      if (state.status === "ended" && action.status === "idle") return state;
      return {
        ...state,
        status: action.status,
        errorMessage: action.errorMessage ?? state.errorMessage,
      };

    case "SET_SPEAKING":
      return { ...state, isSpeaking: action.value };

    case "AI_TEXT":
      return {
        ...state,
        lastAiText: action.text,
        hasAiSpoken: true,
      };

    case "ADD_TRANSCRIPT":
      return {
        ...state,
        transcript: [...state.transcript, action.entry],
      };

    case "GAME_OVER":
      // "ended" is terminal — don't allow further status changes after this
      return { ...state, status: "ended", isSpeaking: false };

    case "TICK":
      if (state.status !== "playing" || state.isPaused) return state;
      return { ...state, elapsedSeconds: state.elapsedSeconds + 1 };

    case "TOGGLE_PAUSE":
      return { ...state, isPaused: !state.isPaused };

    case "SET_MIC_MUTED":
      return { ...state, micMuted: action.value };

    case "SET_PHASE":
      return { ...state, phase: action.phase };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────

const GameContext = createContext<GameContextValue | null>(null);

// ─────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // ── Stable refs for callbacks (prevent stale closure bugs) ──
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Gemini Live session ref ──────────────────────────────────
  const sessionRef = useRef<Session | null>(null);

  // ── Audio I/O refs ───────────────────────────────────────────
  const audioPlaybackRef = useRef<AudioPlayback | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);

  // Initialize AudioPlayback on mount (client-only)
  useEffect(() => {
    audioPlaybackRef.current = new AudioPlayback();
    return () => {
      audioPlaybackRef.current?.destroy();
      audioPlaybackRef.current = null;
    };
  }, []);

  // ── Elapsed time ticker ───────────────────────────────────────
  // 1s interval when playing; paused or non-playing states skip TICK via reducer guard
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTicker = useCallback(() => {
    if (tickerRef.current !== null) return;
    tickerRef.current = setInterval(() => {
      dispatch({ type: "TICK" });
    }, 1000);
  }, []);

  const stopTicker = useCallback(() => {
    if (tickerRef.current !== null) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }, []);

  // ── Silence nudge timer ───────────────────────────────────────
  // When status=playing, isSpeaking=false, and not paused for 12 seconds,
  // send a silence nudge to prompt Gemini to continue the story.
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const current = stateRef.current;
    if (current.status !== "playing" || current.isPaused) return;

    silenceTimerRef.current = setTimeout(() => {
      const s = stateRef.current;
      // Double-check state hasn't changed while we were waiting
      if (s.status !== "playing" || s.isSpeaking || s.isPaused) return;
      const session = sessionRef.current;
      if (!session) return;
      console.log("[GameContext] Silence nudge — sending [The patient waits...]");
      try {
        session.sendClientContent({
          turns: "[The patient waits in silence...]",
          turnComplete: true,
        });
      } catch (err) {
        console.warn("[GameContext] Silence nudge failed:", err);
      }
    }, 12_000);
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // ── isSpeaking / paused changes → restart silence timer ──────
  useEffect(() => {
    if (state.status !== "playing") {
      clearSilenceTimer();
      return;
    }
    if (state.isSpeaking || state.isPaused) {
      clearSilenceTimer();
    } else {
      resetSilenceTimer();
    }
  }, [state.isSpeaking, state.isPaused, state.status, clearSilenceTimer, resetSilenceTimer]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopTicker();
      clearSilenceTimer();
      audioCaptureRef.current?.stop();
      audioCaptureRef.current = null;
      audioPlaybackRef.current?.destroy();
      audioPlaybackRef.current = null;
      if (sessionRef.current) {
        try {
          sessionRef.current.close();
        } catch {
          // ignore
        }
        sessionRef.current = null;
      }
    };
  }, [stopTicker, clearSilenceTimer]);

  // ── Accumulating AI transcript text ──────────────────────────
  // Gemini streams text in fragments. We accumulate them in a ref and
  // commit the full turn to the transcript when generationComplete fires.
  const aiTextAccumRef = useRef<string>("");

  // ── Connect to Gemini Live ────────────────────────────────────
  const startSession = useCallback(async (storyId: string) => {
    dispatch({ type: "SET_STATUS", status: "connecting" });

    try {
      // 1. Fetch ephemeral token from server (system prompt locked in server-side)
      const tokenRes = await fetch("/api/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId }),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        throw new Error(`Failed to get ephemeral token (${tokenRes.status}): ${errorText}`);
      }

      const { token } = (await tokenRes.json()) as { token: string };

      // 2. Request microphone access before connecting (fail fast if blocked)
      try {
        await audioCaptureRef.current?.stop(); // stop any previous capture
      } catch {
        // ignore
      }

      // 3. Connect to Gemini Live using the ephemeral token as the API key
      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      } as ConstructorParameters<typeof GoogleGenAI>[0]);

      const session = await ai.live.connect({
        model: "gemini-live-2.5-flash-native-audio",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Charon" },
            },
          },
          // Transcript of AI audio output — allows us to display and parse text
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outputAudioTranscription: {} as any,
          // Session resumption tokens (valid 2h) — handles brief disconnects
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sessionResumption: {} as any,
          // Compress old context to keep session alive beyond 10-15 min
          contextWindowCompression: { slidingWindow: {} },
          // Affective dialog — adapts voice register to player's emotional tone
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          enableAffectiveDialog: true as any,
          // Low end-of-speech sensitivity — waits longer before cutting off player
          realtimeInputConfig: {
            automaticActivityDetection: {
              endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
              silenceDurationMs: 1200,
            },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        } as Record<string, unknown>,
        callbacks: {
          onopen: () => {
            console.log("[GameContext] Gemini Live session opened");
            dispatch({ type: "SET_STATUS", status: "playing" });
            startTicker();
          },

          onmessage: (msg) => {
            // ── Audio output ─────────────────────────────────────────────
            const parts = msg.serverContent?.modelTurn?.parts ?? [];
            let hadAudio = false;

            for (const part of parts) {
              // Skip internal thinking tokens
              if ((part as Record<string, unknown>).thought) continue;

              // Audio chunk — play immediately via AudioPlayback
              if (part.inlineData?.data) {
                hadAudio = true;
                audioPlaybackRef.current?.play(part.inlineData.data);
                if (!stateRef.current.hasAiSpoken) {
                  dispatch({ type: "SET_SPEAKING", value: true });
                }
              }
            }

            if (hadAudio && !stateRef.current.isSpeaking) {
              dispatch({ type: "SET_SPEAKING", value: true });
            }

            // ── Output transcription (text of what Gemini is saying) ─────
            // Comes in msg.serverContent.outputTranscription.text (streaming fragments)
            const outputTranscription = (
              msg.serverContent as Record<string, unknown> | undefined
            )?.outputTranscription as { text?: string } | undefined;

            if (outputTranscription?.text) {
              aiTextAccumRef.current += outputTranscription.text;
              // Update lastAiText incrementally for real-time display
              dispatch({ type: "AI_TEXT", text: aiTextAccumRef.current });
            }

            // ── Input transcription (what the user said) ─────────────────
            const inputTranscription = (
              msg.serverContent as Record<string, unknown> | undefined
            )?.inputTranscription as { text?: string } | undefined;

            if (inputTranscription?.text?.trim()) {
              dispatch({
                type: "ADD_TRANSCRIPT",
                entry: { source: "user", text: inputTranscription.text.trim() },
              });
            }

            // ── Generation complete — commit AI turn to transcript ────────
            if (msg.serverContent?.generationComplete) {
              dispatch({ type: "SET_SPEAKING", value: false });

              const aiText = aiTextAccumRef.current.trim();
              if (aiText) {
                dispatch({
                  type: "ADD_TRANSCRIPT",
                  entry: { source: "ai", text: aiText },
                });
              }
              aiTextAccumRef.current = "";
            }

            // ── Interrupted (barge-in) ────────────────────────────────────
            if ((msg.serverContent as Record<string, unknown> | undefined)?.interrupted) {
              console.log("[GameContext] Barge-in detected — clearing audio queue");
              audioPlaybackRef.current?.stop();
              aiTextAccumRef.current = "";
              dispatch({ type: "SET_SPEAKING", value: false });
            }

            // ── Turn complete ─────────────────────────────────────────────
            if (msg.serverContent?.turnComplete) {
              dispatch({ type: "SET_SPEAKING", value: false });
            }

            // ── Session resumption token ──────────────────────────────────
            // Log but don't need to act — SDK handles reconnection automatically
            const resumptionUpdate = (
              msg as unknown as Record<string, unknown>
            )?.sessionResumptionUpdate as { newHandle?: string } | undefined;

            if (resumptionUpdate?.newHandle) {
              console.log("[GameContext] Session resumption token refreshed");
            }
          },

          onerror: (e: ErrorEvent) => {
            console.error("[GameContext] Gemini Live error:", e.message);
            dispatch({
              type: "SET_STATUS",
              status: "error",
              errorMessage: e.message ?? "Gemini Live connection error",
            });
            stopTicker();
            clearSilenceTimer();
          },

          onclose: (e: CloseEvent) => {
            console.log("[GameContext] Gemini Live session closed:", e.code, e.reason);
            sessionRef.current = null;
            audioCaptureRef.current?.stop();
            audioCaptureRef.current = null;
            stopTicker();
            clearSilenceTimer();

            const current = stateRef.current;
            // Only transition to ended/error if not already in a terminal state
            if (current.status !== "ended" && current.status !== "error") {
              if (e.code === 1000 || e.code === 1001) {
                // Normal closure — game ended gracefully
                dispatch({ type: "GAME_OVER" });
              } else {
                dispatch({
                  type: "SET_STATUS",
                  status: "error",
                  errorMessage: e.reason || `Connection closed (code ${e.code})`,
                });
              }
            }
          },
        },
      });

      sessionRef.current = session;

      // 4. Start mic capture — stream 16kHz PCM to Gemini
      const capture = new AudioCapture((base64: string) => {
        const s = stateRef.current;
        if (s.micMuted || s.isPaused || s.status !== "playing") return;
        try {
          session.sendRealtimeInput({
            audio: {
              data: base64,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch (err) {
          console.warn("[GameContext] Failed to send audio chunk:", err);
        }
      });

      audioCaptureRef.current = capture;

      try {
        await capture.start();
        console.log("[GameContext] Microphone capture started");
      } catch (err) {
        // Mic access denied — still let the session run (Elara can monologue)
        console.warn("[GameContext] Microphone access denied:", err);
        dispatch({
          type: "SET_STATUS",
          status: "error",
          errorMessage: "Microphone access denied. Please allow microphone access and retry.",
        });
        session.close();
        stopTicker();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[GameContext] startSession failed:", message);
      dispatch({
        type: "SET_STATUS",
        status: "error",
        errorMessage: message,
      });
    }
  }, [startTicker, stopTicker, clearSilenceTimer]);

  // ── End session (user-initiated) ─────────────────────────────
  const endSession = useCallback(() => {
    console.log("[GameContext] endSession called");
    stopTicker();
    clearSilenceTimer();

    audioCaptureRef.current?.stop();
    audioCaptureRef.current = null;

    audioPlaybackRef.current?.stop();

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        // ignore
      }
      sessionRef.current = null;
    }

    dispatch({ type: "GAME_OVER" });
  }, [stopTicker, clearSilenceTimer]);

  // ── Toggle pause ──────────────────────────────────────────────
  const togglePause = useCallback(() => {
    dispatch({ type: "TOGGLE_PAUSE" });
    // After toggling, the isSpeaking effect will handle silence timer restart
  }, []);

  // ── Toggle mic mute ───────────────────────────────────────────
  const toggleMicMute = useCallback(() => {
    dispatch({ type: "SET_MIC_MUTED", value: !stateRef.current.micMuted });
  }, []);

  const value: GameContextValue = {
    phase: state.phase,
    status: state.status,
    isSpeaking: state.isSpeaking,
    isPaused: state.isPaused,
    transcript: state.transcript,
    hasAiSpoken: state.hasAiSpoken,
    lastAiText: state.lastAiText,
    micMuted: state.micMuted,
    elapsedSeconds: state.elapsedSeconds,
    errorMessage: state.errorMessage,
    startSession,
    endSession,
    togglePause,
    toggleMicMute,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
