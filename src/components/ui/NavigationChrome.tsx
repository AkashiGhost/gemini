"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { BreathingDot } from "./BreathingDot";
import { DEFAULT_STORY_ID } from "@/lib/constants";

interface NavigationChromeProps {
  onMenuToggle: () => void;
  menuOpen: boolean;
  variant?: "landing" | "catalogue" | "play";
}

export function NavigationChrome({
  onMenuToggle,
  menuOpen,
  variant = "landing",
}: NavigationChromeProps) {
  const [soundOn, setSoundOn] = useState(true);

  // Persist sound preference
  useEffect(() => {
    const stored = localStorage.getItem("innerplay-sound");
    if (stored !== null) setSoundOn(stored === "on");
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    localStorage.setItem("innerplay-sound", next ? "on" : "off");
  };

  const beginHref =
    variant === "landing"
      ? "#stories"
      : `/play?story=${DEFAULT_STORY_ID}`;

  const delay = variant === "landing" ? 1.8 : 0;

  return (
    <motion.nav
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 100,
        padding: "var(--space-sm)",
        paddingTop: "calc(var(--space-sm) + env(safe-area-inset-top, 0px))",
        paddingBottom: "calc(var(--space-sm) + env(safe-area-inset-bottom, 0px))",
      }}
      aria-label="Site navigation"
    >
      {/* Top-left: Dot + Wordmark */}
      <div
        style={{
          position: "absolute",
          top: "var(--space-sm)",
          left: "var(--space-sm)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-xs)",
          pointerEvents: "auto",
          minHeight: "var(--touch-min)",
        }}
      >
        <BreathingDot size={10} />
        <a
          href="/"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--type-section)",
            color: "var(--white)",
            letterSpacing: "3px",
            textDecoration: "none",
            lineHeight: 1,
          }}
        >
          INNERPLAY
        </a>
      </div>

      {/* Top-right: Menu toggle */}
      <button
        type="button"
        onClick={onMenuToggle}
        style={{
          position: "absolute",
          top: "var(--space-sm)",
          right: "var(--space-sm)",
          pointerEvents: "auto",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--type-ui)",
          color: "var(--white)",
          background: "none",
          border: "none",
          cursor: "pointer",
          letterSpacing: "2px",
          minHeight: "var(--touch-min)",
          minWidth: "var(--touch-min)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {menuOpen ? "CLOSE" : "MENU"}
      </button>

      {/* Bottom-left: Sound toggle (desktop only) */}
      <button
        type="button"
        onClick={toggleSound}
        className="chrome-bottom"
        style={{
          position: "absolute",
          bottom: "var(--space-sm)",
          left: "var(--space-sm)",
          pointerEvents: "auto",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--type-ui)",
          color: "var(--muted)",
          background: "none",
          border: "none",
          cursor: "pointer",
          letterSpacing: "1px",
          minHeight: "var(--touch-min)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {soundOn ? "SOUND ON" : "SOUND OFF"}
      </button>

      {/* Bottom-right: BEGIN CTA (desktop only) */}
      <a
        href={beginHref}
        className="chrome-bottom"
        onClick={(e) => {
          if (beginHref.startsWith("#")) {
            e.preventDefault();
            document
              .getElementById(beginHref.slice(1))
              ?.scrollIntoView({ behavior: "smooth" });
          }
        }}
        style={{
          position: "absolute",
          bottom: "var(--space-sm)",
          right: "var(--space-sm)",
          pointerEvents: "auto",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--type-ui)",
          color: "var(--accent)",
          textDecoration: "none",
          letterSpacing: "3px",
          minHeight: "var(--touch-min)",
          display: "flex",
          alignItems: "center",
        }}
      >
        BEGIN
      </a>

      {/* Mobile: hide bottom items */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .chrome-bottom { display: none !important; }
        }
      `}} />
    </motion.nav>
  );
}
