"use client";

import { useState, useEffect, useCallback } from "react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Put on headphones",
    subtitle: "This experience is designed for stereo audio.",
  },
  {
    title: "Dim the lights",
    subtitle: "Find a quiet, dark space.",
  },
  {
    title: "Close your eyes",
    subtitle: "The session begins in...",
    countdown: true,
  },
];

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const currentStep = STEPS[step];

  const advance = useCallback(() => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  }, [step]);

  // Countdown on final step
  useEffect(() => {
    if (!currentStep.countdown) return;

    if (countdown <= 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, currentStep.countdown, onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--color-bg)",
        zIndex: 100,
        padding: "var(--space-8)",
        textAlign: "center",
      }}
      className="fade-in"
    >
      <h2
        style={{
          fontSize: "var(--font-size-2xl)",
          fontWeight: 400,
          fontFamily: "var(--font-body)",
          marginBottom: "var(--space-4)",
          color: "var(--color-text-primary)",
        }}
      >
        {currentStep.title}
      </h2>

      <p
        style={{
          fontSize: "var(--font-size-lg)",
          color: "var(--color-text-secondary)",
          marginBottom: "var(--space-8)",
          maxWidth: "28ch",
        }}
      >
        {currentStep.subtitle}
      </p>

      {currentStep.countdown ? (
        <div
          style={{
            fontSize: "var(--font-size-3xl)",
            color: "var(--color-accent)",
            fontFamily: "var(--font-body)",
            fontWeight: 300,
          }}
        >
          {countdown}
        </div>
      ) : (
        <button
          onClick={advance}
          style={{
            minHeight: "var(--touch-min)",
            padding: "var(--space-3) var(--space-8)",
            border: "1px solid var(--color-accent-dim)",
            borderRadius: "var(--radius-full)",
            color: "var(--color-accent)",
            fontSize: "var(--font-size-base)",
            fontFamily: "var(--font-body)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            transition: "var(--transition-normal)",
            backgroundColor: "transparent",
          }}
        >
          Continue
        </button>
      )}

      {/* Step indicators */}
      <div
        style={{
          position: "absolute",
          bottom: "var(--space-8)",
          display: "flex",
          gap: "var(--space-2)",
        }}
      >
        {STEPS.map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "var(--radius-full)",
              backgroundColor:
                i <= step
                  ? "var(--color-accent)"
                  : "var(--color-text-muted)",
              transition: "var(--transition-normal)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
