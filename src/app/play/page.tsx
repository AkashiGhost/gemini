"use client";

import { useState, useCallback } from "react";
import { GameProvider, useGame } from "@/context/GameContext";
import { OnboardingFlow } from "@/components/game/OnboardingFlow";
import { GameSession } from "@/components/game/GameSession";

function PlayContent() {
  const [onboardingDone, setOnboardingDone] = useState(false);
  const { status, startSession } = useGame();

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingDone(true);
    startSession();
  }, [startSession]);

  if (!onboardingDone) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  if (status === "connecting") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
        }}
      >
        <div
          className="breathe"
          style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}
        >
          Connecting...
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100dvh",
          gap: "var(--space-4)",
          padding: "var(--space-8)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--color-danger)" }}>
          Connection lost. The session cannot continue.
        </p>
        <a
          href="/"
          style={{
            color: "var(--color-accent)",
            fontSize: "var(--font-size-sm)",
          }}
        >
          Return home
        </a>
      </div>
    );
  }

  return <GameSession />;
}

export default function PlayPage() {
  return (
    <GameProvider>
      <PlayContent />
    </GameProvider>
  );
}
