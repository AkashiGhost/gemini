"use client";

import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { FunctionResponseScheduling, GoogleGenAI, Modality } from "@google/genai";
import type { FunctionCall, Session } from "@google/genai";
import { AudioCapture } from "@/lib/audio-capture";
import { AudioPlayback } from "@/lib/audio-playback";
import {
  LIVE_RUNTIME_CONFIG,
  parseLiveToolCall,
  tensionToPhase,
  type LiveToolCallEvent,
  type LiveToolCallListener,
} from "@/lib/config/live-tools";
import { createLogger, extendCausalChain } from "@/lib/logging";

export interface TranscriptEntry {
  source: "user" | "ai";
  text: string;
}

export interface GameContextValue {
  phase: number;
  sessionId: string | undefined;
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
  setPhase: (phase: number, options?: { reason?: string; causalChain?: string[] }) => void;
  setPhaseFromTension: (tension: number, options?: { reason?: string; causalChain?: string[] }) => number;
  onToolCall: (listener: LiveToolCallListener) => () => void;
  togglePause: () => void;
  toggleMicMute: () => void;
}

type UIState = {
  phase: number;
  sessionId: string | undefined;
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
  | { type: "SET_PHASE"; phase: number }
  | { type: "SET_SESSION_ID"; sessionId: string | undefined };

const initialState: UIState = {
  phase: 0,
  sessionId: undefined,
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
      if (state.status === "ended" && action.status === "idle") return state;
      return {
        ...state,
        status: action.status,
        errorMessage: action.errorMessage ?? state.errorMessage,
      };

    case "SET_SPEAKING":
      return { ...state, isSpeaking: action.value };

    case "AI_TEXT":
      return { ...state, lastAiText: action.text, hasAiSpoken: true };

    case "ADD_TRANSCRIPT":
      return { ...state, transcript: [...state.transcript, action.entry] };

    case "GAME_OVER":
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

    case "SET_SESSION_ID":
      return { ...state, sessionId: action.sessionId };

    default:
      return state;
  }
}

const GameContext = createContext<GameContextValue | null>(null);

interface PendingEndGame {
  callId: string;
  reason?: string;
  fadeOutSeconds?: number;
  causalChain: string[];
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialState);
  const loggerRef = useRef(createLogger("GameContext"));
  const logger = loggerRef.current;

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const toolCallSubscribersRef = useRef<Set<LiveToolCallListener>>(new Set());
  const pendingEndGameRef = useRef<PendingEndGame | null>(null);

  const onToolCall = useCallback((listener: LiveToolCallListener) => {
    toolCallSubscribersRef.current.add(listener);
    return () => {
      toolCallSubscribersRef.current.delete(listener);
    };
  }, []);

  const emitToolCall = useCallback((toolCall: LiveToolCallEvent) => {
    for (const listener of toolCallSubscribersRef.current) {
      try {
        listener(toolCall);
      } catch (error) {
        logger.warn({
          event: "tool.subscriber_error",
          sessionId: toolCall.sessionId,
          causalChain: extendCausalChain(toolCall.causalChain, "tool.subscriber_error"),
          error,
          data: { tool: toolCall.name, callId: toolCall.callId },
        });
      }
    }
  }, [logger]);

  const sessionRef = useRef<Session | null>(null);
  const audioPlaybackRef = useRef<AudioPlayback | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);

  useEffect(() => {
    audioPlaybackRef.current = new AudioPlayback();
    return () => {
      audioPlaybackRef.current?.destroy();
      audioPlaybackRef.current = null;
    };
  }, []);

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

  const setPhase = useCallback(
    (phase: number, options?: { reason?: string; causalChain?: string[] }) => {
      const clampedPhase = Math.max(0, Math.min(4, Math.trunc(phase)));
      dispatch({ type: "SET_PHASE", phase: clampedPhase });
      logger.info({
        event: "phase.updated",
        sessionId: stateRef.current.sessionId,
        causalChain: extendCausalChain(options?.causalChain, "phase.updated"),
        data: { phase: clampedPhase, reason: options?.reason ?? "manual" },
      });
    },
    [logger],
  );

  const setPhaseFromTension = useCallback(
    (tension: number, options?: { reason?: string; causalChain?: string[] }) => {
      const phase = tensionToPhase(tension);
      setPhase(phase, {
        reason: options?.reason ?? "set_tension",
        causalChain: extendCausalChain(options?.causalChain, `tension:${tension.toFixed(3)}`),
      });
      return phase;
    },
    [setPhase],
  );

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
      if (s.status !== "playing" || s.isSpeaking || s.isPaused) return;
      const session = sessionRef.current;
      if (!session) return;
      logger.info({
        event: "silence_nudge.send",
        sessionId: s.sessionId,
        causalChain: ["silence_timer", "silence_nudge.send"],
      });
      try {
        session.sendClientContent({
          turns: "[The patient waits in silence...]",
          turnComplete: true,
        });
      } catch (error) {
        logger.warn({
          event: "silence_nudge.failed",
          sessionId: s.sessionId,
          causalChain: ["silence_timer", "silence_nudge.failed"],
          error,
        });
      }
    }, LIVE_RUNTIME_CONFIG.silenceNudgeMs);
  }, [logger]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current !== null) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

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
          // no-op
        }
        sessionRef.current = null;
      }
    };
  }, [stopTicker, clearSilenceTimer]);

  const aiTextAccumRef = useRef<string>("");

  const sendSilentToolAck = useCallback(
    (session: Session, functionCall: FunctionCall, sessionId: string | undefined, causalChain: string[]) => {
      try {
        // end_game uses WHEN_IDLE so Gemini finishes its current sentence before closing.
        // All other tools use SILENT to avoid interrupting voice output.
        const scheduling = functionCall.name === "end_game"
          ? FunctionResponseScheduling.WHEN_IDLE
          : FunctionResponseScheduling.SILENT;
        session.sendToolResponse({
          functionResponses: [{
            id: functionCall.id,
            name: functionCall.name,
            response: { output: { ok: true } },
            scheduling,
          }],
        });

        logger.info({
          event: "tool.ack_sent",
          sessionId,
          causalChain: extendCausalChain(causalChain, "tool.ack_sent"),
          data: { tool: functionCall.name, callId: functionCall.id },
        });
      } catch (error) {
        logger.warn({
          event: "tool.ack_failed",
          sessionId,
          causalChain: extendCausalChain(causalChain, "tool.ack_failed"),
          error,
          data: { tool: functionCall.name, callId: functionCall.id },
        });
      }
    },
    [logger],
  );

  const handleLiveToolCalls = useCallback(
    (functionCalls: FunctionCall[], session: Session, sessionId: string | undefined) => {
      for (const functionCall of functionCalls) {
        const parsed = parseLiveToolCall(functionCall, {
          sessionId,
          causalChain: ["tool.received"],
        });

        if (!parsed) {
          logger.warn({
            event: "tool.invalid_payload",
            sessionId,
            causalChain: ["tool.received", "tool.invalid_payload"],
            data: {
              name: functionCall.name,
              callId: functionCall.id,
              args: functionCall.args as Record<string, unknown> | undefined,
            },
          });
          continue;
        }

        logger.info({
          event: "tool.received",
          sessionId,
          causalChain: parsed.causalChain,
          data: {
            name: parsed.name,
            callId: parsed.callId,
            args: parsed.args as unknown as Record<string, unknown>,
          },
        });

        sendSilentToolAck(session, functionCall, sessionId, parsed.causalChain);

        if (parsed.name === "set_tension") {
          const phase = parsed.args.phase != null
            ? Math.max(0, Math.min(4, Math.trunc(parsed.args.phase)))
            : setPhaseFromTension(parsed.args.tension, {
              reason: "tool:set_tension",
              causalChain: parsed.causalChain,
            });

          if (parsed.args.phase != null) {
            setPhase(phase, {
              reason: "tool:set_tension:explicit_phase",
              causalChain: parsed.causalChain,
            });
          }

          logger.info({
            event: "tool.set_tension.applied",
            sessionId,
            causalChain: extendCausalChain(parsed.causalChain, "tool.set_tension.applied"),
            data: {
              tension: parsed.args.tension,
              phase,
              transitionSeconds: parsed.args.transitionSeconds,
            },
          });
        }

        if (parsed.name === "end_game") {
          pendingEndGameRef.current = {
            callId: parsed.callId,
            reason: parsed.args.reason,
            fadeOutSeconds: parsed.args.fadeOutSeconds,
            causalChain: extendCausalChain(parsed.causalChain, "tool.end_game.pending"),
          };
          logger.info({
            event: "tool.end_game.pending",
            sessionId,
            causalChain: pendingEndGameRef.current.causalChain,
            data: {
              reason: parsed.args.reason,
              fadeOutSeconds: parsed.args.fadeOutSeconds,
            },
          });
        }

        emitToolCall(parsed);
      }
    },
    [emitToolCall, logger, sendSilentToolAck, setPhase, setPhaseFromTension],
  );

  const endSession = useCallback(() => {
    stopTicker();
    clearSilenceTimer();
    pendingEndGameRef.current = null;

    audioCaptureRef.current?.stop();
    audioCaptureRef.current = null;

    audioPlaybackRef.current?.stop();

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        // no-op
      }
      sessionRef.current = null;
    }

    dispatch({ type: "GAME_OVER" });
    logger.info({
      event: "session.ended",
      sessionId: stateRef.current.sessionId,
      causalChain: ["session.ended"],
    });
  }, [clearSilenceTimer, logger, stopTicker]);

  useEffect(() => {
    if (!pendingEndGameRef.current) return;
    if (state.isSpeaking) return;
    if (state.status !== "playing") return;

    const pending = pendingEndGameRef.current;
    pendingEndGameRef.current = null;
    logger.info({
      event: "tool.end_game.executing",
      sessionId: state.sessionId,
      causalChain: extendCausalChain(pending.causalChain, "tool.end_game.executing"),
      data: { reason: pending.reason, fadeOutSeconds: pending.fadeOutSeconds },
    });
    endSession();
  }, [endSession, logger, state.isSpeaking, state.sessionId, state.status]);

  const startSession = useCallback(async (storyId: string) => {
    const sessionId = createSessionId();
    dispatch({ type: "SET_SESSION_ID", sessionId });
    dispatch({ type: "SET_STATUS", status: "connecting" });
    dispatch({ type: "SET_PHASE", phase: 0 });

    try {
      const tokenRes = await fetch("/api/live-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({ storyId }),
      });

      if (!tokenRes.ok) {
        const errorText = await tokenRes.text();
        throw new Error(`Failed to get ephemeral token (${tokenRes.status}): ${errorText}`);
      }

      const { token } = (await tokenRes.json()) as { token: string };

      try {
        await audioCaptureRef.current?.stop();
      } catch {
        // no-op
      }

      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      } as ConstructorParameters<typeof GoogleGenAI>[0]);

      const session = await ai.live.connect({
        model: LIVE_RUNTIME_CONFIG.modelName,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: LIVE_RUNTIME_CONFIG.voiceName },
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          outputAudioTranscription: {} as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sessionResumption: {} as any,
          contextWindowCompression: { slidingWindow: {} },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          enableAffectiveDialog: true as any,
          realtimeInputConfig: {
            automaticActivityDetection: {
              endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
              silenceDurationMs: LIVE_RUNTIME_CONFIG.realtimeInputSilenceDurationMs,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        } as Record<string, unknown>,
        callbacks: {
          onopen: () => {
            dispatch({ type: "SET_STATUS", status: "playing" });
            startTicker();
            logger.info({
              event: "session.open",
              sessionId,
              causalChain: ["session.open"],
              data: { model: LIVE_RUNTIME_CONFIG.modelName, storyId },
            });
          },

          onmessage: (msg) => {
            if (msg.toolCall?.functionCalls?.length && sessionRef.current) {
              handleLiveToolCalls(msg.toolCall.functionCalls, sessionRef.current, sessionId);
            }

            const parts = msg.serverContent?.modelTurn?.parts ?? [];
            let hadAudio = false;

            for (const part of parts) {
              if ((part as Record<string, unknown>).thought) continue;
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

            const outputTranscription = (
              msg.serverContent as Record<string, unknown> | undefined
            )?.outputTranscription as { text?: string } | undefined;

            if (outputTranscription?.text) {
              aiTextAccumRef.current += outputTranscription.text;
              dispatch({ type: "AI_TEXT", text: aiTextAccumRef.current });
            }

            const inputTranscription = (
              msg.serverContent as Record<string, unknown> | undefined
            )?.inputTranscription as { text?: string } | undefined;

            if (inputTranscription?.text?.trim()) {
              dispatch({
                type: "ADD_TRANSCRIPT",
                entry: { source: "user", text: inputTranscription.text.trim() },
              });
            }

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

            if ((msg.serverContent as Record<string, unknown> | undefined)?.interrupted) {
              audioPlaybackRef.current?.stop();
              aiTextAccumRef.current = "";
              dispatch({ type: "SET_SPEAKING", value: false });
            }

            if (msg.serverContent?.turnComplete) {
              dispatch({ type: "SET_SPEAKING", value: false });
            }
          },

          onerror: (errorEvent: ErrorEvent) => {
            dispatch({
              type: "SET_STATUS",
              status: "error",
              errorMessage: errorEvent.message ?? "Gemini Live connection error",
            });
            stopTicker();
            clearSilenceTimer();
            logger.error({
              event: "session.error",
              sessionId,
              causalChain: ["session.error"],
              data: { message: errorEvent.message },
            });
          },

          onclose: (closeEvent: CloseEvent) => {
            sessionRef.current = null;
            audioCaptureRef.current?.stop();
            audioCaptureRef.current = null;
            stopTicker();
            clearSilenceTimer();

            const current = stateRef.current;
            if (current.status !== "ended" && current.status !== "error") {
              if (closeEvent.code === 1000 || closeEvent.code === 1001) {
                dispatch({ type: "GAME_OVER" });
              } else {
                dispatch({
                  type: "SET_STATUS",
                  status: "error",
                  errorMessage: closeEvent.reason || `Connection closed (code ${closeEvent.code})`,
                });
              }
            }

            logger.info({
              event: "session.closed",
              sessionId,
              causalChain: ["session.closed"],
              data: {
                code: closeEvent.code,
                reason: closeEvent.reason,
              },
            });
          },
        },
      });

      sessionRef.current = session;

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
        } catch (error) {
          logger.warn({
            event: "mic.send_failed",
            sessionId,
            causalChain: ["mic.send_failed"],
            error,
          });
        }
      });

      audioCaptureRef.current = capture;

      try {
        await capture.start();
        logger.info({
          event: "mic.started",
          sessionId,
          causalChain: ["mic.started"],
        });
      } catch (error) {
        dispatch({
          type: "SET_STATUS",
          status: "error",
          errorMessage: "Microphone access denied. Please allow microphone access and retry.",
        });
        session.close();
        stopTicker();

        logger.error({
          event: "mic.start_failed",
          sessionId,
          causalChain: ["mic.start_failed"],
          error,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      dispatch({
        type: "SET_STATUS",
        status: "error",
        errorMessage: message,
      });
      logger.error({
        event: "session.start_failed",
        sessionId,
        causalChain: ["session.start_failed"],
        error,
      });
    }
  }, [clearSilenceTimer, handleLiveToolCalls, logger, startTicker, stopTicker]);

  const togglePause = useCallback(() => {
    dispatch({ type: "TOGGLE_PAUSE" });
  }, []);

  const toggleMicMute = useCallback(() => {
    dispatch({ type: "SET_MIC_MUTED", value: !stateRef.current.micMuted });
  }, []);

  const value: GameContextValue = {
    phase: state.phase,
    sessionId: state.sessionId,
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
    setPhase,
    setPhaseFromTension,
    onToolCall,
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
