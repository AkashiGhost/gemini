"use client";

import { stripSoundMarkers } from "@/lib/sound-cue-parser";

// ─────────────────────────────────────────────
// VoiceOrb — live speaker visualizer
//
// A glowing blob that drifts LEFT when the AI character speaks (amber)
// and RIGHT when the player speaks (cool blue). Shows live speech text.
// Does not replace the history transcript — that lives at the bottom.
// ─────────────────────────────────────────────

type OrbState = "waiting" | "listening" | "ai-speaking" | "player-turn";

interface VoiceOrbProps {
  isSpeaking: boolean;
  hasAiSpoken: boolean;
  status: string;
  lastAiText: string;
  lastUserTranscriptText: string;
  characterName: string;
}

const ORB_CONFIG: Record<
  OrbState,
  {
    translateX: string;
    orbGradient: string;
    orbShadow: string;
    labelColor: string;
    textAlign: "left" | "right" | "center";
    textColor: string;
    fontStyle: "italic" | "normal";
  }
> = {
  waiting: {
    translateX: "0%",
    orbGradient:
      "radial-gradient(circle at 38% 32%, rgba(255,255,255,0.22), rgba(255,255,255,0.04) 68%)",
    orbShadow: "0 0 32px rgba(255,255,255,0.07)",
    labelColor: "rgba(255,255,255,0.3)",
    textAlign: "center",
    textColor: "var(--muted)",
    fontStyle: "italic",
  },
  listening: {
    translateX: "18%",
    orbGradient:
      "radial-gradient(circle at 38% 32%, rgba(205,225,255,0.78), rgba(120,170,255,0.08) 68%)",
    orbShadow:
      "0 0 36px rgba(170,210,255,0.18), 0 0 84px rgba(120,170,255,0.08)",
    labelColor: "rgba(195,220,255,0.82)",
    textAlign: "right",
    textColor: "rgba(238,245,255,0.94)",
    fontStyle: "normal",
  },
  "ai-speaking": {
    translateX: "-28%",
    orbGradient:
      "radial-gradient(circle at 38% 32%, rgba(232,148,60,0.95), rgba(232,148,60,0.18) 68%)",
    orbShadow:
      "0 0 48px rgba(232,148,60,0.4), 0 0 100px rgba(232,148,60,0.14)",
    labelColor: "rgba(232,148,60,0.75)",
    textAlign: "left",
    textColor: "var(--white)",
    fontStyle: "italic",
  },
  "player-turn": {
    translateX: "28%",
    orbGradient:
      "radial-gradient(circle at 38% 32%, rgba(190,215,255,0.9), rgba(160,190,255,0.15) 68%)",
    orbShadow:
      "0 0 48px rgba(180,210,255,0.3), 0 0 100px rgba(160,190,255,0.1)",
    labelColor: "rgba(214,230,255,0.94)",
    textAlign: "right",
    textColor: "rgba(242,247,255,0.98)",
    fontStyle: "normal",
  },
};

function getOrbState(
  status: string,
  isSpeaking: boolean,
  hasAiSpoken: boolean,
  lastUserTranscriptText: string,
): OrbState {
  if (status !== "playing") return "waiting";
  if (isSpeaking) return "ai-speaking";
  if (hasAiSpoken) {
    return lastUserTranscriptText.trim() ? "player-turn" : "listening";
  }
  return "waiting";
}

function truncateLive(text: string, maxChars = 120): string {
  if (!text) return "";
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  // Show the most recent chunk — last maxChars characters
  return "…" + trimmed.slice(trimmed.length - maxChars);
}

export function VoiceOrb({
  isSpeaking,
  hasAiSpoken,
  status,
  lastAiText,
  lastUserTranscriptText,
  characterName,
}: VoiceOrbProps) {
  const orbState = getOrbState(status, isSpeaking, hasAiSpoken, lastUserTranscriptText);
  const cfg = ORB_CONFIG[orbState];

  const liveText =
    orbState === "ai-speaking"
      ? truncateLive(stripSoundMarkers(lastAiText))
      : orbState === "player-turn"
        ? truncateLive(lastUserTranscriptText)
        : "";

  const speakerLabel =
    orbState === "ai-speaking"
      ? characterName
      : orbState === "player-turn"
        ? "You"
        : "";

  return (
    <>
      {/* Keyframe injection — single pulse used by orb when active */}
      <style>{`
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.06); }
        }
        @keyframes orb-idle {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50%       { transform: scale(1.03); opacity: 1; }
        }
      `}</style>

      {/* Outer wrapper — this shifts left/right as a unit */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems:
            orbState === "ai-speaking"
              ? "flex-start"
              : orbState === "player-turn" || orbState === "listening"
                ? "flex-end"
                : "center",
          gap: "10px",
          width: "100%",
          maxWidth: 340,
          transform: `translateX(${cfg.translateX})`,
          transition:
            "transform 0.65s cubic-bezier(0.34, 1.2, 0.64, 1)",
        }}
      >
        {/* The orb */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: cfg.orbGradient,
            boxShadow: cfg.orbShadow,
            transition: "background 0.5s ease, box-shadow 0.5s ease",
            animation:
              orbState === "waiting"
                ? "orb-idle 3.5s ease-in-out infinite"
                : "orb-breathe 1.8s ease-in-out infinite",
            flexShrink: 0,
          }}
        />

        {/* Speaker label */}
        {speakerLabel && (
          <span
            style={{
              fontSize: "var(--type-caption)",
              fontFamily: "var(--font-ui)",
              color: cfg.labelColor,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {speakerLabel}
          </span>
        )}

        {/* Live speech text */}
        {liveText && (
          <p
            style={{
              margin: 0,
              maxWidth: "26ch",
              fontSize: "var(--type-body)",
              fontFamily: "var(--font-literary)",
              fontStyle: cfg.fontStyle,
              color: cfg.textColor,
              lineHeight: 1.5,
              textAlign: cfg.textAlign,
              opacity: 0.88,
            }}
          >
            {liveText}
          </p>
        )}
      </div>
    </>
  );
}
