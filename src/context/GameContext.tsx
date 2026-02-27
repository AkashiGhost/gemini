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
import type { StoryState, StoryAction } from "@/lib/types/story-state";
import type { ServerMessage, ChoicePromptPayload } from "@/lib/types/llm";
import { storyReducer } from "@/lib/state-machine";

// ─────────────────────────────────────────────
// Game context — React Context + useReducer + WebSocket
// ─────────────────────────────────────────────

interface GameContextValue {
  /** Current game state (subset — full state lives on server) */
  phase: number;
  beatIndex: number;
  elapsedSeconds: number;
  trustLevel: number;
  status: "connecting" | "ready" | "playing" | "ended" | "error";
  /** Current choice prompt (null when no choice active) */
  activeChoice: ChoicePromptPayload | null;
  /** Last Elara text (for display/accessibility) */
  lastElaraText: string;
  /** Sound cues to play */
  pendingSoundCues: Array<{ soundId: string; position: number }>;
  /** Actions */
  sendText: (text: string) => void;
  selectChoice: (beatId: string, optionId: string) => void;
  startSession: () => void;
  clearSoundCues: () => void;
}

type UIState = {
  phase: number;
  beatIndex: number;
  elapsedSeconds: number;
  trustLevel: number;
  status: "connecting" | "ready" | "playing" | "ended" | "error";
  activeChoice: ChoicePromptPayload | null;
  lastElaraText: string;
  pendingSoundCues: Array<{ soundId: string; position: number }>;
};

type UIAction =
  | { type: "SET_STATUS"; status: UIState["status"] }
  | { type: "STATE_UPDATE"; payload: Record<string, unknown> }
  | { type: "CHOICE_PROMPT"; payload: ChoicePromptPayload }
  | { type: "CLEAR_CHOICE" }
  | { type: "ELARA_TEXT"; text: string }
  | { type: "SOUND_CUE"; soundId: string; position: number }
  | { type: "CLEAR_SOUND_CUES" }
  | { type: "GAME_OVER" };

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.status };
    case "STATE_UPDATE":
      return {
        ...state,
        phase: (action.payload.phaseIndex as number) ?? state.phase,
        beatIndex: (action.payload.beatIndex as number) ?? state.beatIndex,
        elapsedSeconds:
          (action.payload.elapsedSeconds as number) ?? state.elapsedSeconds,
        trustLevel: (action.payload.trustLevel as number) ?? state.trustLevel,
      };
    case "CHOICE_PROMPT":
      return { ...state, activeChoice: action.payload };
    case "CLEAR_CHOICE":
      return { ...state, activeChoice: null };
    case "ELARA_TEXT":
      return { ...state, lastElaraText: action.text };
    case "SOUND_CUE":
      return {
        ...state,
        pendingSoundCues: [
          ...state.pendingSoundCues,
          { soundId: action.soundId, position: action.position },
        ],
      };
    case "CLEAR_SOUND_CUES":
      return { ...state, pendingSoundCues: [] };
    case "GAME_OVER":
      return { ...state, status: "ended", activeChoice: null };
    default:
      return state;
  }
}

const initialUIState: UIState = {
  phase: 0,
  beatIndex: 0,
  elapsedSeconds: 0,
  trustLevel: 3,
  status: "connecting",
  activeChoice: null,
  lastElaraText: "",
  pendingSoundCues: [],
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialUIState);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection
  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      dispatch({ type: "SET_STATUS", status: "ready" });
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data) as ServerMessage;

      switch (msg.type) {
        case "SESSION_READY":
          dispatch({ type: "SET_STATUS", status: "playing" });
          break;
        case "STATE_UPDATE":
          dispatch({
            type: "STATE_UPDATE",
            payload: msg.payload as Record<string, unknown>,
          });
          break;
        case "CHOICE_PROMPT":
          dispatch({
            type: "CHOICE_PROMPT",
            payload: msg.payload as ChoicePromptPayload,
          });
          break;
        case "AUDIO_CHUNK": {
          const audioPayload = msg.payload as {
            text?: string;
            audio?: string;
          };
          if (audioPayload?.text) {
            dispatch({ type: "ELARA_TEXT", text: audioPayload.text });
          }
          break;
        }
        case "SOUND_CUE": {
          const cuePayload = msg.payload as {
            soundId: string;
            position: number;
          };
          dispatch({
            type: "SOUND_CUE",
            soundId: cuePayload.soundId,
            position: cuePayload.position,
          });
          break;
        }
        case "PHASE_TRANSITION":
          // Handled via STATE_UPDATE
          break;
        case "GAME_OVER":
          dispatch({ type: "GAME_OVER" });
          break;
        case "ERROR":
          console.error("Server error:", msg.payload);
          break;
      }
    };

    ws.onclose = () => {
      dispatch({ type: "SET_STATUS", status: "error" });
    };

    ws.onerror = () => {
      dispatch({ type: "SET_STATUS", status: "error" });
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  const sendWs = useCallback((type: string, payload?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const startSession = useCallback(() => {
    sendWs("INIT", { gameId: "the-last-session", provider: "mock" });
  }, [sendWs]);

  const sendText = useCallback(
    (text: string) => {
      sendWs("AUDIO_CHUNK", { text });
    },
    [sendWs],
  );

  const selectChoice = useCallback(
    (beatId: string, optionId: string) => {
      dispatch({ type: "CLEAR_CHOICE" });
      sendWs("CHOICE_SELECTED", { beatId, optionId });
    },
    [sendWs],
  );

  const clearSoundCues = useCallback(() => {
    dispatch({ type: "CLEAR_SOUND_CUES" });
  }, []);

  const value: GameContextValue = {
    ...state,
    sendText,
    selectChoice,
    startSession,
    clearSoundCues,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}
