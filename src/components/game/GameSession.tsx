"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/context/GameContext";
import { useSoundEngine } from "@/hooks/useSoundEngine";
import { stripSoundMarkers } from "@/lib/sound-cue-parser";
import { AtmosphereLayer } from "./AtmosphereLayer";
import { BreathingDot } from "@/components/ui/BreathingDot";

// ─────────────────────────────────────────────
// Game Session — Mistral / ElevenLabs version
// ElevenLabs handles mic + TTS entirely.
// We show: AI character's text, speaking/listening state, choice overlay.
// AtmosphereLayer renders for stories with visual atmosphere (Room 4B).
// Breathing dot adapts animation speed to current story phase.
// ─────────────────────────────────────────────

// Character name displayed in the transcript for AI messages
const CHARACTER_NAME = "Elara";

interface GameSessionProps {
  storyId: string;
}

// Stories that show the AtmosphereLayer (fog/vignette)
const ATMOSPHERE_STORIES = new Set(["room-4b"]);

export function GameSession({ storyId }: GameSessionProps) {
  const {
    phase,
    status,
    lastAiText,
    isSpeaking,
    isPaused,
    hasAiSpoken,
    transcript,
    endSession,
    togglePause,
  } = useGame();

  const showAtmosphere = ATMOSPHERE_STORIES.has(storyId);

  // ── Responsive dot size: 12px mobile, 20px desktop (≥768px) ──────────
  const [dotSize, setDotSize] = useState(12);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = (e: MediaQueryListEvent | MediaQueryList) => setDotSize(e.matches ? 20 : 12);
    update(mq);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ── Sound Engine — story-aware ambient sounds, timeline, TTS ducking ──
  useSoundEngine({
    storyId,
    status,
    isSpeaking,
    isPaused,
    hasAiSpoken,
    lastAiText,
  });

  // ── Mount / unmount logging ──────────────────────────────────
  useEffect(() => {
    console.log("[SESSION] GameSession mounted");
    return () => {
      console.log("[SESSION] GameSession unmounted");
    };
  }, []);

  // ── Status change logging ────────────────────────────────────
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      console.log(`[SESSION] Status changed: ${prevStatusRef.current} → ${status}`);
      prevStatusRef.current = status;
    }
  }, [status]);

  // ── isSpeaking change logging ────────────────────────────────
  const prevIsSpeakingRef = useRef(isSpeaking);
  useEffect(() => {
    if (prevIsSpeakingRef.current !== isSpeaking) {
      console.log(`[SESSION] isSpeaking changed: ${prevIsSpeakingRef.current} → ${isSpeaking}`);
      prevIsSpeakingRef.current = isSpeaking;
    }
  }, [isSpeaking]);

  // ── hasAiSpoken change logging ────────────────────────────
  const prevHasAiSpokenRef = useRef(hasAiSpoken);
  useEffect(() => {
    if (prevHasAiSpokenRef.current !== hasAiSpoken) {
      console.log(`[SESSION] hasAiSpoken changed: ${prevHasAiSpokenRef.current} → ${hasAiSpoken}`);
      prevHasAiSpokenRef.current = hasAiSpoken;
    }
  }, [hasAiSpoken]);

  // TTS fallback REMOVED — window.speechSynthesis.cancel() + speak() was
  // disrupting Chrome's WebRTC audio routing on Windows, causing ElevenLabs
  // voice output to be completely silent. The 300ms timer also had a stale
  // closure bug (hasAiSpoken missing from deps). ElevenLabs handles TTS
  // natively via WebRTC — no browser fallback needed.

  // ── Transcript scroll — auto-scroll to latest message ───────────────
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  if (status === "ended") {
    return (
      <div
        className="fade-in"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          backgroundColor: "var(--black)",
          padding: "var(--space-md)",
          textAlign: "center",
          gap: "var(--space-md)",
        }}
      >
        <p
          style={{
            color: "var(--muted)",
            fontSize: "var(--type-lead)",
            fontFamily: "var(--font-literary)",
            fontStyle: "italic",
            maxWidth: "32ch",
          }}
        >
          {lastAiText || "The session has ended."}
        </p>
        <a
          href="/"
          style={{
            color: "var(--muted)",
            fontSize: "var(--type-caption)",
            fontFamily: "var(--font-ui)",
            opacity: 0.6,
            display: "inline-flex",
            alignItems: "center",
            minHeight: "var(--touch-min)",
            padding: "var(--space-xs) var(--space-sm)",
          }}
        >
          return home
        </a>
      </div>
    );
  }

  // ── Tap-to-reveal controls ──────────────────────────────────
  const [showControls, setShowControls] = useState(false);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!showControls) return;
    controlsTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    return () => {
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [showControls]);

  const handleMainAreaClick = () => {
    setShowControls(true);
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        backgroundColor: "var(--black)",
      }}
    >
      {/* Atmosphere layer — fog/vignette for stories that use it */}
      {showAtmosphere && <AtmosphereLayer phase={phase} />}

      {/* Main area — nearly blank during gameplay */}
      <div
        onClick={handleMainAreaClick}
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-lg)",
          position: "relative",
          zIndex: 1,
          cursor: "default",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-sm)",
          }}
        >
          {/* Breathing / speaking indicator — phase-aware animation */}
          <BreathingDot size={dotSize} phase={phase} isSpeaking={isSpeaking} />
          {status === "playing" && !hasAiSpoken && (
            <p
              style={{
                color: "var(--muted)",
                fontSize: "var(--type-body)",
                fontFamily: "var(--font-literary)",
                fontStyle: "italic",
                margin: 0,
                opacity: 0.6,
              }}
            >
              preparing the session...
            </p>
          )}
          {/* "tap anywhere" hint — only visible when controls are hidden */}
          {status === "playing" && hasAiSpoken && !showControls && (
            <p
              style={{
                color: "var(--muted)",
                fontSize: "var(--type-ui)",
                fontFamily: "var(--font-ui)",
                margin: 0,
                opacity: 0.3,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginTop: "var(--space-lg)",
              }}
            >
              tap anywhere for controls
            </p>
          )}
        </div>
      </div>

      {/* Scrolling transcript overlay — bottom portion of screen */}
      {transcript.length > 0 && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            maxHeight: "40vh",
            overflowY: "auto",
            backgroundColor: "rgba(0, 0, 0, 0.72)",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            padding: "var(--space-sm) var(--space-md)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-xs)",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(255,255,255,0.12) transparent",
          }}
        >
          {transcript.map((entry, idx) => {
            const isUser = entry.source === "user";
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: isUser ? "flex-end" : "flex-start",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--type-caption)",
                    fontFamily: "var(--font-ui)",
                    color: "var(--muted)",
                    opacity: 0.55,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    marginBottom: 2,
                  }}
                >
                  {isUser ? "You" : CHARACTER_NAME}
                </span>
                <p
                  style={{
                    margin: 0,
                    maxWidth: "72ch",
                    fontSize: "var(--type-ui)",
                    fontFamily: "var(--font-literary)",
                    fontStyle: isUser ? "normal" : "italic",
                    lineHeight: 1.55,
                    color: isUser ? "var(--muted)" : "var(--white)",
                    textAlign: isUser ? "right" : "left",
                  }}
                >
                  {entry.source === "ai" ? stripSoundMarkers(entry.text) : entry.text}
                </p>
              </div>
            );
          })}
          {/* Anchor for auto-scroll to bottom */}
          <div ref={transcriptEndRef} />
        </div>
      )}

      {/* Screen reader transcript */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {lastAiText}
      </div>

      {/* Pause overlay */}
      {isPaused && (
        <div
          className="fade-in"
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-md)",
            zIndex: 50,
          }}
        >
          <p
            style={{
              color: "var(--muted)",
              fontSize: "var(--type-body)",
              fontFamily: "var(--font-literary)",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            session paused
          </p>
          <button
            type="button"
            onClick={togglePause}
            style={{
              background: "none",
              border: "1px solid var(--muted)",
              color: "var(--white)",
              fontSize: "var(--type-body)",
              fontFamily: "var(--font-ui)",
              cursor: "pointer",
              padding: "var(--space-sm) var(--space-md)",
              borderRadius: 0,
              letterSpacing: "0.04em",
              minHeight: 48,
              minWidth: 120,
            }}
          >
            resume
          </button>
        </div>
      )}

      {/* Tap-to-reveal bottom controls */}
      {showControls && (
        <div
          className="fade-in"
          style={{
            padding: "var(--space-md)",
            textAlign: "center",
            display: "flex",
            justifyContent: "center",
            gap: "var(--space-lg)",
          }}
        >
          <button
            type="button"
            onClick={togglePause}
            style={{
              background: "none",
              border: "1px solid var(--muted)",
              color: "var(--muted)",
              fontSize: "var(--type-body)",
              fontFamily: "var(--font-ui)",
              cursor: "pointer",
              opacity: 0.7,
              padding: "var(--space-sm) var(--space-md)",
              letterSpacing: "0.04em",
              minHeight: "var(--touch-min)",
              minWidth: 100,
              borderRadius: 0,
            }}
          >
            pause
          </button>
          <button
            type="button"
            onClick={() => {
              console.log("[SESSION] User clicked 'end session' button");
              void endSession();
            }}
            style={{
              background: "none",
              border: "1px solid var(--muted)",
              color: "var(--muted)",
              fontSize: "var(--type-body)",
              fontFamily: "var(--font-ui)",
              cursor: "pointer",
              opacity: 0.55,
              padding: "var(--space-sm) var(--space-md)",
              letterSpacing: "0.04em",
              minHeight: "var(--touch-min)",
              minWidth: 130,
              borderRadius: 0,
            }}
          >
            end session
          </button>
        </div>
      )}
    </div>
  );
}
