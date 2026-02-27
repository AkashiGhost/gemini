"use client";

import { useState, useRef, useCallback } from "react";
import { useGame } from "@/context/GameContext";
import { ChoiceDisplay } from "./ChoiceDisplay";

export function GameSession() {
  const { status, lastElaraText, sendText } = useGame();
  const [inputText, setInputText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim()) return;
      sendText(inputText.trim());
      setInputText("");
    },
    [inputText, sendText],
  );

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
          padding: "var(--space-8)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            color: "var(--color-text-secondary)",
            fontSize: "var(--font-size-lg)",
            fontFamily: "var(--font-body)",
            fontStyle: "italic",
            maxWidth: "32ch",
          }}
        >
          {lastElaraText || "The session has ended."}
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100dvh",
        backgroundColor: "var(--color-bg)",
      }}
    >
      {/* Main area — nearly blank during gameplay */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
        }}
      >
        {/* Breathing indicator */}
        <div
          className="breathe"
          style={{
            width: 12,
            height: 12,
            borderRadius: "var(--radius-full)",
            backgroundColor: "var(--color-accent-dim)",
          }}
        />
      </div>

      {/* Elara's last text — subtle, for accessibility */}
      {lastElaraText && (
        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            color: "var(--color-text-muted)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-body)",
            fontStyle: "italic",
            textAlign: "center",
            maxHeight: "20vh",
            overflow: "hidden",
          }}
        >
          {lastElaraText}
        </div>
      )}

      {/* Choice overlay */}
      <ChoiceDisplay />

      {/* Text input (for testing — in production this is voice) */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "var(--space-2)",
          padding: "var(--space-4)",
          borderTop: "1px solid var(--color-bg-elevated)",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Speak to Elara..."
          style={{
            flex: 1,
            minHeight: "var(--touch-min)",
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-bg-elevated)",
            border: "1px solid var(--color-bg-surface)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-text-primary)",
            fontSize: "var(--font-size-base)",
            fontFamily: "var(--font-body)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            minHeight: "var(--touch-min)",
            minWidth: "var(--touch-min)",
            padding: "var(--space-2) var(--space-4)",
            backgroundColor: "var(--color-bg-surface)",
            border: "1px solid var(--color-accent-dim)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-accent)",
            fontSize: "var(--font-size-sm)",
            fontFamily: "var(--font-ui)",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
