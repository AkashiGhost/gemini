"use client";

import { useGame } from "@/context/GameContext";

export function ChoiceDisplay() {
  const { activeChoice, selectChoice } = useGame();

  if (!activeChoice) return null;

  return (
    <div
      className="fade-in"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "40vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "var(--space-4)",
        padding: "var(--space-6)",
        background:
          "linear-gradient(to top, var(--color-bg) 60%, transparent)",
      }}
    >
      {activeChoice.options.map((option) => (
        <button
          key={option.id}
          onClick={() => selectChoice(activeChoice.beatId, option.id)}
          style={{
            width: "100%",
            maxWidth: 400,
            minHeight: "var(--touch-min)",
            padding: "var(--space-4) var(--space-6)",
            border: "1px solid var(--color-accent-dim)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
            fontSize: "var(--font-size-base)",
            fontFamily: "var(--font-body)",
            backgroundColor: "var(--color-bg-surface)",
            textAlign: "left",
            transition: "var(--transition-normal)",
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
