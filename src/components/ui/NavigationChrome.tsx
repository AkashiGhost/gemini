"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { BreathingDot } from "./BreathingDot";
import { DEFAULT_STORY_ID } from "@/lib/constants";

interface NavigationChromeProps {
  onMenuToggle: () => void;
  menuOpen: boolean;
  variant?: "landing" | "catalogue" | "play";
}

const SOUND_PREF_KEY = "innerplay-sound";
const SOUND_PREF_EVENT = "innerplay-sound-change";

function getSoundPrefServerSnapshot(): boolean {
  return true;
}

function getSoundPrefSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  const stored = window.localStorage.getItem(SOUND_PREF_KEY);
  return stored === null ? true : stored === "on";
}

function subscribeSoundPref(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === SOUND_PREF_KEY) callback();
  };
  const onLocalChange = () => callback();
  window.addEventListener("storage", onStorage);
  window.addEventListener(SOUND_PREF_EVENT, onLocalChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(SOUND_PREF_EVENT, onLocalChange);
  };
}

function setSoundPref(nextOn: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SOUND_PREF_KEY, nextOn ? "on" : "off");
  window.dispatchEvent(new Event(SOUND_PREF_EVENT));
}

export function NavigationChrome({
  onMenuToggle,
  menuOpen,
  variant = "landing",
}: NavigationChromeProps) {
  const soundOn = useSyncExternalStore(
    subscribeSoundPref,
    getSoundPrefSnapshot,
    getSoundPrefServerSnapshot,
  );

  const toggleSound = () => {
    setSoundPref(!soundOn);
  };

  const beginHref =
    variant === "landing"
      ? "#stories"
      : `/play?story=${DEFAULT_STORY_ID}`;

  const delay = variant === "landing" ? 1.8 : 0;
  const isHashBegin = beginHref.startsWith("#");

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
        <Link
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
        </Link>
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
      {isHashBegin ? (
        <a
          href={beginHref}
          className="chrome-bottom"
          onClick={(e) => {
            e.preventDefault();
            document
              .getElementById(beginHref.slice(1))
              ?.scrollIntoView({ behavior: "smooth" });
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
      ) : (
        <Link
          href={beginHref}
          className="chrome-bottom"
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
        </Link>
      )}

      {/* Mobile: hide bottom items */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 767px) {
          .chrome-bottom { display: none !important; }
        }
      `}} />
    </motion.nav>
  );
}
