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
import { FunctionResponseScheduling, GoogleGenAI } from "@google/genai";
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
import {
  buildNoModelResponseErrorMessage,
  didReceiveModelResponse,
} from "@/context/session-response-guard";
import { getOpeningTurnUnlockDecision } from "@/context/turn-completion-policy";
import {
  beginOpeningTurn,
  handleOpeningTurnInterrupted,
  markOpeningTurnCompleted,
  markOpeningTurnResponseReceived,
  shouldFailOpeningTurn,
  shouldSendOpeningFallback,
  type OpeningTurnState,
} from "@/context/opening-turn-state";
import { shouldStartMicCapture } from "@/context/mic-activation-policy";
import { shouldScheduleSilenceNudge } from "@/context/session-flow-guards";

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
  lastUserTranscriptText: string;
  lastUserTranscriptSeq: number;
  hasAiSpoken: boolean;
  lastAiText: string;
  micMuted: boolean;
  elapsedSeconds: number;
  errorMessage: string | undefined;
  startSession: (storyId: string, options?: { deferKickoff?: boolean }) => Promise<void>;
  kickoffSession: (storyId: string) => void;
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
  lastUserTranscriptText: string;
  lastUserTranscriptSeq: number;
  hasAiSpoken: boolean;
  lastAiText: string;
  micMuted: boolean;
  elapsedSeconds: number;
  errorMessage: string | undefined;
};

type UIAction =
  | { type: "SET_STATUS"; status: UIState["status"]; errorMessage?: string }
  | { type: "SET_SPEAKING"; value: boolean }
  | { type: "MARK_AI_SPOKEN" }
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
  lastUserTranscriptText: "",
  lastUserTranscriptSeq: 0,
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

    case "MARK_AI_SPOKEN":
      return state.hasAiSpoken ? state : { ...state, hasAiSpoken: true };

    case "AI_TEXT":
      return { ...state, lastAiText: action.text, hasAiSpoken: true };

    case "ADD_TRANSCRIPT": {
      const transcript = [...state.transcript, action.entry];
      if (action.entry.source !== "user") {
        return { ...state, transcript };
      }
      return {
        ...state,
        transcript,
        lastUserTranscriptText: action.entry.text,
        lastUserTranscriptSeq: state.lastUserTranscriptSeq + 1,
      };
    }

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

interface PendingKickoff {
  storyId: string;
  causalChain: string[];
}

function createSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getInitialKickoffPrompt(storyId: string): string {
  if (storyId === "the-call") {
    return "The phone has just been answered. Speak immediately as Alex with one urgent line, then pause for the player.";
  }
  return "Begin the session now. Speak first in character with one short opening line, then pause for the player.";
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
  const closingSessionRef = useRef<Session | null>(null);
  const audioPlaybackRef = useRef<AudioPlayback | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const pendingKickoffRef = useRef<PendingKickoff | null>(null);
  const micStreamingEnabledRef = useRef(true);
  const openingTurnStateRef = useRef<OpeningTurnState>({
    locked: false,
    responseReceived: false,
    completed: false,
  });
  const micEnableFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstResponseFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstResponseFailureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAiTurnFinalizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micStartInFlightRef = useRef(false);

  const safeCloseSession = useCallback((session: Session | null | undefined) => {
    if (!session) return;
    // StrictMode/dev can run cleanup paths multiple times; close must be idempotent.
    if (closingSessionRef.current === session) return;
    closingSessionRef.current = session;
    try {
      session.close();
    } catch {
      // no-op
    }
  }, []);

  const clearMicEnableFallbackTimer = useCallback(() => {
    if (micEnableFallbackTimerRef.current !== null) {
      clearTimeout(micEnableFallbackTimerRef.current);
      micEnableFallbackTimerRef.current = null;
    }
  }, []);

  const clearConnectTimeout = useCallback(() => {
    if (connectTimeoutRef.current !== null) {
      clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  }, []);

  const clearFirstResponseWatchdog = useCallback(() => {
    if (firstResponseFallbackTimerRef.current !== null) {
      clearTimeout(firstResponseFallbackTimerRef.current);
      firstResponseFallbackTimerRef.current = null;
    }
    if (firstResponseFailureTimerRef.current !== null) {
      clearTimeout(firstResponseFailureTimerRef.current);
      firstResponseFailureTimerRef.current = null;
    }
  }, []);

  const clearPendingAiTurnFinalizeTimer = useCallback(() => {
    if (pendingAiTurnFinalizeTimerRef.current !== null) {
      clearTimeout(pendingAiTurnFinalizeTimerRef.current);
      pendingAiTurnFinalizeTimerRef.current = null;
    }
  }, []);

  const failNoModelResponse = useCallback((sessionId: string | undefined, causalChain: string[]) => {
    const current = stateRef.current;
    if (current.status !== "playing" || current.sessionId !== sessionId) return;
    if (!shouldFailOpeningTurn(openingTurnStateRef.current)) return;

    const totalTimeoutMs = LIVE_RUNTIME_CONFIG.firstResponseFallbackMs + LIVE_RUNTIME_CONFIG.firstResponseFailureMs;
    const message = buildNoModelResponseErrorMessage(totalTimeoutMs);

    audioCaptureRef.current?.stop();
    audioCaptureRef.current = null;
    safeCloseSession(sessionRef.current);
    sessionRef.current = null;

    dispatch({
      type: "SET_STATUS",
      status: "error",
      errorMessage: message,
    });

    logger.error({
      event: "session.first_response_timeout",
      sessionId,
      causalChain: extendCausalChain(causalChain, "session.first_response_timeout"),
      data: { totalTimeoutMs },
    });
  }, [logger, safeCloseSession]);

  const startFirstResponseWatchdog = useCallback(
    (session: Session, sessionId: string | undefined, storyId: string, causalChain: string[]) => {
      clearFirstResponseWatchdog();
      firstResponseFallbackTimerRef.current = setTimeout(() => {
        const current = stateRef.current;
        if (current.status !== "playing" || current.sessionId !== sessionId) return;
        if (!shouldSendOpeningFallback(openingTurnStateRef.current)) return;

        logger.warn({
          event: "session.first_response_delayed",
          sessionId,
          causalChain: extendCausalChain(causalChain, "session.first_response_delayed"),
          data: { waitMs: LIVE_RUNTIME_CONFIG.firstResponseFallbackMs },
        });

        try {
          if (sessionRef.current === session && closingSessionRef.current !== session) {
            session.sendClientContent({
              turns: getInitialKickoffPrompt(storyId),
              turnComplete: true,
            });
            logger.info({
              event: "session.first_response_fallback_sent",
              sessionId,
              causalChain: extendCausalChain(causalChain, "session.first_response_fallback_sent"),
              data: { storyId },
            });
          }
        } catch (error) {
          logger.warn({
            event: "session.first_response_fallback_failed",
            sessionId,
            causalChain: extendCausalChain(causalChain, "session.first_response_fallback_failed"),
            error,
            data: { storyId },
          });
        }

        firstResponseFailureTimerRef.current = setTimeout(() => {
          if (shouldFailOpeningTurn(openingTurnStateRef.current)) {
            failNoModelResponse(sessionId, causalChain);
          }
        }, LIVE_RUNTIME_CONFIG.firstResponseFailureMs);
      }, LIVE_RUNTIME_CONFIG.firstResponseFallbackMs);
    },
    [clearFirstResponseWatchdog, failNoModelResponse, logger],
  );

  const enableMicStreaming = useCallback((sessionId: string | undefined, reason: string) => {
    if (openingTurnStateRef.current.locked) {
      logger.info({
        event: "mic.streaming_deferred",
        sessionId,
        causalChain: ["mic.streaming_deferred"],
        data: { reason },
      });
      return;
    }
    if (micStreamingEnabledRef.current) return;
    micStreamingEnabledRef.current = true;
    clearMicEnableFallbackTimer();
    logger.info({
      event: "mic.streaming_enabled",
      sessionId,
      causalChain: ["mic.streaming_enabled"],
      data: { reason },
    });
  }, [clearMicEnableFallbackTimer, logger]);

  const startMicCapture = useCallback(async (session: Session, sessionId: string | undefined) => {
    if (!shouldStartMicCapture({
      status: stateRef.current.status,
      openingTurnLocked: openingTurnStateRef.current.locked,
      micCaptureStarted: audioCaptureRef.current !== null,
      micStartInFlight: micStartInFlightRef.current,
    })) {
      return;
    }

    micStartInFlightRef.current = true;

    try {
      const capture = new AudioCapture((base64: string) => {
        const s = stateRef.current;
        if (s.micMuted || s.isPaused || s.status !== "playing") return;
        if (!micStreamingEnabledRef.current) return;
        if (closingSessionRef.current === session) return;
        if (sessionRef.current !== session) return;

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

      await capture.start();

      if (closingSessionRef.current === session || sessionRef.current !== session) {
        capture.stop();
        return;
      }

      audioCaptureRef.current = capture;
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
      openingTurnStateRef.current = {
        locked: false,
        responseReceived: false,
        completed: false,
      };
      safeCloseSession(session);
      if (tickerRef.current !== null) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }

      logger.error({
        event: "mic.start_failed",
        sessionId,
        causalChain: ["mic.start_failed"],
        error,
      });
    } finally {
      micStartInFlightRef.current = false;
    }
  }, [logger, safeCloseSession]);

  const finalizeAiTurn = useCallback((session: Session | null, sessionId: string | undefined, reason: string) => {
    clearPendingAiTurnFinalizeTimer();
    const openingTurnWasLocked = openingTurnStateRef.current.locked;

    if (openingTurnWasLocked) {
      openingTurnStateRef.current = markOpeningTurnCompleted(openingTurnStateRef.current);
      clearFirstResponseWatchdog();
    }

    if (openingTurnWasLocked && !stateRef.current.hasAiSpoken) {
      dispatch({ type: "MARK_AI_SPOKEN" });
      logger.info({
        event: "session.first_response_completed_without_payload",
        sessionId,
        causalChain: ["session.first_response_completed_without_payload"],
        data: { reason },
      });
    }

    enableMicStreaming(sessionId, reason);
    if (session) {
      void startMicCapture(session, sessionId);
    }
    dispatch({ type: "SET_SPEAKING", value: false });

    const aiText = aiTextAccumRef.current.trim();
    if (aiText) {
      dispatch({
        type: "ADD_TRANSCRIPT",
        entry: { source: "ai", text: aiText },
      });
    }
    aiTextAccumRef.current = "";
  }, [clearFirstResponseWatchdog, clearPendingAiTurnFinalizeTimer, enableMicStreaming, logger, startMicCapture]);

  const scheduleAiTurnFinalize = useCallback((sessionId: string | undefined, reason: string) => {
    clearPendingAiTurnFinalizeTimer();
    const session = sessionRef.current;
    if (!session) return;
    const remainingPlaybackMs = audioPlaybackRef.current?.getRemainingPlaybackMs() ?? 0;
    const decision = getOpeningTurnUnlockDecision(remainingPlaybackMs);

    if (decision.unlockNow) {
      finalizeAiTurn(session, sessionId, reason);
      return;
    }

    logger.info({
      event: "session.turn_finalize_deferred",
      sessionId,
      causalChain: ["session.turn_finalize_deferred"],
      data: { reason, remainingPlaybackMs, unlockAfterMs: decision.unlockAfterMs },
    });

    pendingAiTurnFinalizeTimerRef.current = setTimeout(() => {
      finalizeAiTurn(session, sessionId, `${reason}:playback_drained`);
    }, decision.unlockAfterMs);
  }, [clearPendingAiTurnFinalizeTimer, finalizeAiTurn, logger]);

  const flushPendingKickoff = useCallback(
    (session: Session, sessionId: string | undefined) => {
      const pending = pendingKickoffRef.current;
      if (!pending) return;
      if (closingSessionRef.current === session) return;
      if (sessionRef.current !== session) return;

      const prompt = getInitialKickoffPrompt(pending.storyId);
      try {
        session.sendClientContent({
          turns: prompt,
          turnComplete: true,
        });
        pendingKickoffRef.current = null;
        startFirstResponseWatchdog(
          session,
          sessionId,
          pending.storyId,
          extendCausalChain(pending.causalChain, "session.kickoff_sent"),
        );
        logger.info({
          event: "session.kickoff_sent",
          sessionId,
          causalChain: extendCausalChain(pending.causalChain, "session.kickoff_sent"),
          data: { storyId: pending.storyId },
        });
      } catch (error) {
        logger.warn({
          event: "session.kickoff_failed",
          sessionId,
          causalChain: extendCausalChain(pending.causalChain, "session.kickoff_failed"),
          error,
          data: { storyId: pending.storyId },
        });
      }
    },
    [logger, startFirstResponseWatchdog],
  );

  const kickoffSession = useCallback(
    (storyId: string) => {
      const causalChain = ["session.kickoff_requested"];
      pendingKickoffRef.current = { storyId, causalChain };

      const session = sessionRef.current;
      if (session) {
        flushPendingKickoff(session, stateRef.current.sessionId);
      } else {
        logger.info({
          event: "session.kickoff_queued",
          sessionId: stateRef.current.sessionId,
          causalChain,
          data: { storyId },
        });
      }
    },
    [flushPendingKickoff, logger],
  );

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
    if (!shouldScheduleSilenceNudge({
      status: current.status,
      isSpeaking: current.isSpeaking,
      isPaused: current.isPaused,
      hasAiSpoken: current.hasAiSpoken,
      openingTurnLocked: openingTurnStateRef.current.locked,
    })) return;

    silenceTimerRef.current = setTimeout(() => {
      const s = stateRef.current;
      if (!shouldScheduleSilenceNudge({
        status: s.status,
        isSpeaking: s.isSpeaking,
        isPaused: s.isPaused,
        hasAiSpoken: s.hasAiSpoken,
        openingTurnLocked: openingTurnStateRef.current.locked,
      })) return;
      const session = sessionRef.current;
      if (!session) return;
      if (closingSessionRef.current === session) return;
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
    if (!shouldScheduleSilenceNudge({
      status: state.status,
      isSpeaking: state.isSpeaking,
      isPaused: state.isPaused,
      hasAiSpoken: state.hasAiSpoken,
      openingTurnLocked: openingTurnStateRef.current.locked,
    })) {
      clearSilenceTimer();
      return;
    }
    resetSilenceTimer();
  }, [state.hasAiSpoken, state.isSpeaking, state.isPaused, state.status, clearSilenceTimer, resetSilenceTimer]);

  useEffect(() => {
    return () => {
      stopTicker();
      clearSilenceTimer();
      clearMicEnableFallbackTimer();
      clearConnectTimeout();
      clearFirstResponseWatchdog();
      clearPendingAiTurnFinalizeTimer();
      micStreamingEnabledRef.current = true;
      micStartInFlightRef.current = false;
      openingTurnStateRef.current = {
        locked: false,
        responseReceived: false,
        completed: false,
      };
      pendingKickoffRef.current = null;
      audioCaptureRef.current?.stop();
      audioCaptureRef.current = null;
      audioPlaybackRef.current?.destroy();
      audioPlaybackRef.current = null;
      safeCloseSession(sessionRef.current);
      sessionRef.current = null;
    };
  }, [stopTicker, clearConnectTimeout, clearFirstResponseWatchdog, clearMicEnableFallbackTimer, clearPendingAiTurnFinalizeTimer, clearSilenceTimer, safeCloseSession]);

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
    clearMicEnableFallbackTimer();
    clearConnectTimeout();
    clearFirstResponseWatchdog();
    clearPendingAiTurnFinalizeTimer();
    micStreamingEnabledRef.current = true;
    micStartInFlightRef.current = false;
    openingTurnStateRef.current = {
      locked: false,
      responseReceived: false,
      completed: false,
    };
    pendingEndGameRef.current = null;
    pendingKickoffRef.current = null;

    audioCaptureRef.current?.stop();
    audioCaptureRef.current = null;

    audioPlaybackRef.current?.stop();

    safeCloseSession(sessionRef.current);
    sessionRef.current = null;

    dispatch({ type: "GAME_OVER" });
    logger.info({
      event: "session.ended",
      sessionId: stateRef.current.sessionId,
      causalChain: ["session.ended"],
    });
  }, [clearConnectTimeout, clearFirstResponseWatchdog, clearMicEnableFallbackTimer, clearPendingAiTurnFinalizeTimer, clearSilenceTimer, logger, safeCloseSession, stopTicker]);

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

  const startSession = useCallback(async (storyId: string, options?: { deferKickoff?: boolean }) => {
    const sessionId = createSessionId();
    dispatch({ type: "SET_SESSION_ID", sessionId });
    dispatch({ type: "SET_STATUS", status: "connecting" });
    dispatch({ type: "SET_PHASE", phase: 0 });
    if (options?.deferKickoff) {
      pendingKickoffRef.current = null;
    } else {
      pendingKickoffRef.current = {
        storyId,
        causalChain: ["session.start", "session.kickoff_requested"],
      };
    }
    micStreamingEnabledRef.current = false;
    openingTurnStateRef.current = beginOpeningTurn();
    clearMicEnableFallbackTimer();
    clearConnectTimeout();
    clearFirstResponseWatchdog();
    clearPendingAiTurnFinalizeTimer();

    connectTimeoutRef.current = setTimeout(() => {
      const current = stateRef.current;
      if (current.status !== "connecting" || current.sessionId !== sessionId) return;

      logger.error({
        event: "session.connect_timeout",
        sessionId,
        causalChain: ["session.connect_timeout"],
        data: { timeoutMs: LIVE_RUNTIME_CONFIG.connectTimeoutMs },
      });

      audioCaptureRef.current?.stop();
      audioCaptureRef.current = null;
      safeCloseSession(sessionRef.current);
      sessionRef.current = null;
      clearFirstResponseWatchdog();
      dispatch({
        type: "SET_STATUS",
        status: "error",
        errorMessage:
          `Session start timed out after ${Math.round(LIVE_RUNTIME_CONFIG.connectTimeoutMs / 1000)}s. ` +
          "Check model availability and API key.",
      });
    }, LIVE_RUNTIME_CONFIG.connectTimeoutMs);

    try {
      // Prime output audio while still inside a potential user-gesture call stack.
      await audioPlaybackRef.current?.prime();

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

      const tokenPayload = (await tokenRes.json()) as { token: string; model?: string };
      const token = tokenPayload.token;
      const liveModel = typeof tokenPayload.model === "string" && tokenPayload.model.trim().length > 0
        ? tokenPayload.model
        : LIVE_RUNTIME_CONFIG.modelName;

      try {
        await audioCaptureRef.current?.stop();
      } catch {
        // no-op
      }

      const ai = new GoogleGenAI({
        apiKey: token,
        httpOptions: { apiVersion: "v1alpha" },
      } as ConstructorParameters<typeof GoogleGenAI>[0]);

      // Config (voice, tools, system prompt, VAD, etc.) is locked in the
      // ephemeral token via liveConnectConstraints. Passing redundant config
      // here can conflict with the BidiGenerateContentConstrained endpoint.
      const session = await ai.live.connect({
        model: liveModel,
        callbacks: {
          onopen: () => {
            clearConnectTimeout();
            dispatch({ type: "SET_STATUS", status: "playing" });
            startTicker();
            clearMicEnableFallbackTimer();
            const activeSession = sessionRef.current;
            if (activeSession) {
              flushPendingKickoff(activeSession, sessionId);
            }
            micEnableFallbackTimerRef.current = setTimeout(() => {
              enableMicStreaming(sessionId, "fallback_timeout");
            }, 8000);
            logger.info({
              event: "session.open",
              sessionId,
              causalChain: ["session.open"],
              data: { model: liveModel, storyId },
            });
          },

          onmessage: (msg) => {
            if (msg.toolCall?.functionCalls?.length && sessionRef.current) {
              handleLiveToolCalls(msg.toolCall.functionCalls, sessionRef.current, sessionId);
            }

            const parts = msg.serverContent?.modelTurn?.parts ?? [];
            let hadAudio = false;
            let modelText = "";

            for (const part of parts) {
              if ((part as Record<string, unknown>).thought) continue;
              if (typeof part.text === "string" && part.text.trim().length > 0) {
                modelText += part.text;
              }
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

            if (didReceiveModelResponse({
              hasAudio: hadAudio,
              modelText,
              outputTranscriptionText: outputTranscription?.text,
            }) && !stateRef.current.hasAiSpoken) {
              openingTurnStateRef.current = markOpeningTurnResponseReceived(openingTurnStateRef.current);
              dispatch({ type: "MARK_AI_SPOKEN" });
              logger.info({
                event: "session.first_response_received",
                sessionId,
                causalChain: ["session.first_response_received"],
                data: {
                  source: hadAudio && outputTranscription?.text?.trim()
                    ? "audio_and_transcription"
                    : hadAudio
                      ? "audio"
                      : outputTranscription?.text?.trim()
                        ? "transcription"
                        : "text",
                },
              });
            }

            if (outputTranscription?.text) {
              aiTextAccumRef.current += outputTranscription.text;
              dispatch({ type: "AI_TEXT", text: aiTextAccumRef.current });
            } else if (modelText.trim()) {
              aiTextAccumRef.current += modelText;
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
              scheduleAiTurnFinalize(sessionId, "generation_complete");
            }

            if ((msg.serverContent as Record<string, unknown> | undefined)?.interrupted) {
              clearPendingAiTurnFinalizeTimer();
              audioPlaybackRef.current?.stop();
              aiTextAccumRef.current = "";
              dispatch({ type: "SET_SPEAKING", value: false });

              const interruptedOpening = handleOpeningTurnInterrupted(openingTurnStateRef.current);
              openingTurnStateRef.current = interruptedOpening.next;

              if (interruptedOpening.shouldRetryOpening && sessionRef.current) {
                pendingKickoffRef.current = {
                  storyId,
                  causalChain: ["session.opening_turn_interrupted", "session.kickoff_requested"],
                };
                flushPendingKickoff(sessionRef.current, sessionId);
                logger.warn({
                  event: "session.opening_turn_interrupted",
                  sessionId,
                  causalChain: ["session.opening_turn_interrupted"],
                });
              }
            }

            if (msg.serverContent?.turnComplete) {
              scheduleAiTurnFinalize(sessionId, "turn_complete");
            }
          },

          onerror: (errorEvent: ErrorEvent) => {
            clearConnectTimeout();
            clearFirstResponseWatchdog();
            clearPendingAiTurnFinalizeTimer();
            dispatch({
              type: "SET_STATUS",
              status: "error",
              errorMessage: errorEvent.message ?? "Gemini Live connection error",
            });
            stopTicker();
            clearSilenceTimer();
            clearMicEnableFallbackTimer();
            micStreamingEnabledRef.current = true;
            micStartInFlightRef.current = false;
            openingTurnStateRef.current = {
              locked: false,
              responseReceived: false,
              completed: false,
            };
            logger.error({
              event: "session.error",
              sessionId,
              causalChain: ["session.error"],
              data: { message: errorEvent.message },
            });
          },

          onclose: (closeEvent: CloseEvent) => {
            clearConnectTimeout();
            clearFirstResponseWatchdog();
            clearPendingAiTurnFinalizeTimer();
            closingSessionRef.current = null;
            sessionRef.current = null;
            audioCaptureRef.current?.stop();
            audioCaptureRef.current = null;
            stopTicker();
            clearSilenceTimer();
            clearMicEnableFallbackTimer();
            micStreamingEnabledRef.current = true;
            micStartInFlightRef.current = false;
            openingTurnStateRef.current = {
              locked: false,
              responseReceived: false,
              completed: false,
            };

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
      flushPendingKickoff(session, sessionId);
    } catch (error) {
      clearConnectTimeout();
      clearFirstResponseWatchdog();
      const message = error instanceof Error ? error.message : String(error);
      dispatch({
        type: "SET_STATUS",
        status: "error",
        errorMessage: message,
      });
      micStartInFlightRef.current = false;
      openingTurnStateRef.current = {
        locked: false,
        responseReceived: false,
        completed: false,
      };
      logger.error({
        event: "session.start_failed",
        sessionId,
        causalChain: ["session.start_failed"],
        error,
      });
    }
  }, [clearConnectTimeout, clearFirstResponseWatchdog, clearMicEnableFallbackTimer, clearPendingAiTurnFinalizeTimer, clearSilenceTimer, enableMicStreaming, flushPendingKickoff, handleLiveToolCalls, logger, safeCloseSession, scheduleAiTurnFinalize, startTicker, stopTicker]);

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
    lastUserTranscriptText: state.lastUserTranscriptText,
    lastUserTranscriptSeq: state.lastUserTranscriptSeq,
    hasAiSpoken: state.hasAiSpoken,
    lastAiText: state.lastAiText,
    micMuted: state.micMuted,
    elapsedSeconds: state.elapsedSeconds,
    errorMessage: state.errorMessage,
    startSession,
    kickoffSession,
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
