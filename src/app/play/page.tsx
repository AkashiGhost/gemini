"use client";

import Link from "next/link";
import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { GameProvider, useGame } from "@/context/GameContext";
import { DEFAULT_STORY_ID } from "@/lib/constants";
import { OnboardingFlow } from "@/components/game/OnboardingFlow";
import { GameSession } from "@/components/game/GameSession";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BreathingDot } from "@/components/ui/BreathingDot";
import { LYRIA_RUNTIME_CONFIG } from "@/lib/config/lyria";
import { classifyPlaySessionError } from "@/lib/play-error-classification";

function PlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const storyId = searchParams.get("story") ?? DEFAULT_STORY_ID;

  const [onboardingDone, setOnboardingDone] = useState(false);
  const [sessionPrepared, setSessionPrepared] = useState(false);
  const [enableAdaptiveMusic, setEnableAdaptiveMusic] = useState(false);
  const { status, startSession, kickoffSession, errorMessage } = useGame();

  // Session ended — navigate back to stories
  useEffect(() => {
    if (onboardingDone && status === "idle") {
      router.push("/#stories");
    }
  }, [onboardingDone, status, router]);

  const handleOnboardingPrepare = useCallback(() => {
    if (sessionPrepared) return;
    setSessionPrepared(true);
    void startSession(storyId, { deferKickoff: true });
  }, [sessionPrepared, startSession, storyId]);

  const handleOnboardingComplete = useCallback(() => {
    if (!sessionPrepared) {
      setSessionPrepared(true);
      void startSession(storyId, { deferKickoff: true });
    }
    kickoffSession(storyId);
    setOnboardingDone(true);
  }, [kickoffSession, sessionPrepared, startSession, storyId]);

  if (!onboardingDone) {
    return (
      <OnboardingFlow
        storyId={storyId}
        isSessionReady={status === "playing" || status === "error"}
        adaptiveMusicAvailable={LYRIA_RUNTIME_CONFIG.enabled}
        enableAdaptiveMusic={enableAdaptiveMusic}
        onToggleAdaptiveMusic={() => setEnableAdaptiveMusic((prev) => !prev)}
        onPrepare={handleOnboardingPrepare}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Connecting to Gemini Live
  if (status === "connecting") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          gap: "var(--space-sm)",
        }}
      >
        <BreathingDot />
        <p
          style={{
            color: "var(--muted)",
            fontSize: "var(--type-ui)",
            fontFamily: "var(--font-literary)",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          preparing the session...
        </p>
      </div>
    );
  }

  if (status === "error") {
    const { title, detail, hint } = classifyPlaySessionError(errorMessage);

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          gap: "var(--space-sm)",
          padding: "var(--space-lg)",
          textAlign: "center",
        }}
      >
        <p style={{
          color: "var(--error)",
          fontFamily: "var(--font-display)",
          fontSize: "var(--type-section)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          margin: 0,
        }}>
          {title}
        </p>
        <p style={{
          color: "var(--muted)",
          fontFamily: "var(--font-literary)",
          fontSize: "var(--type-body)",
          fontStyle: "italic",
          maxWidth: "500px",
          wordBreak: "break-word",
          margin: 0,
        }}>
          {detail}
        </p>
        {hint && (
          <p style={{
            color: "var(--accent)",
            fontFamily: "var(--font-ui)",
            fontSize: "var(--type-caption)",
            maxWidth: "440px",
            margin: 0,
          }}>
            {hint}
          </p>
        )}
        <div style={{ display: "flex", gap: "var(--space-md)", marginTop: "var(--space-sm)" }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              background: "none",
              border: "1px solid var(--muted)",
              color: "var(--muted)",
              padding: "var(--space-xs) var(--space-md)",
              borderRadius: 0,
              cursor: "pointer",
              fontFamily: "var(--font-ui)",
              fontSize: "var(--type-ui)",
              minHeight: "var(--touch-min)",
            }}
          >
            Retry
          </button>
          <Link
            href="/"
            style={{
              color: "var(--muted)",
              fontSize: "var(--type-ui)",
              display: "inline-flex",
              alignItems: "center",
              minHeight: "var(--touch-min)",
              padding: "var(--space-xs) var(--space-sm)",
            }}
          >
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return <GameSession storyId={storyId} enableAdaptiveMusic={enableAdaptiveMusic} />;
}

export default function PlayPage() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <Suspense>
          <PlayContent />
        </Suspense>
      </GameProvider>
    </ErrorBoundary>
  );
}
