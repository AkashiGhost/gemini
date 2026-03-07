"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { DEFAULT_STORY_ID } from "@/lib/constants";

// ─────────────────────────────────────────────
// Story-specific onboarding data
// Scene images + text overlays + first audio line
// The LAST text shown is the FIRST line the AI speaks (image-to-audio bridge)
// ─────────────────────────────────────────────

interface StoryOnboarding {
  scenes: Array<{
    image?: string;
    text: string;
  }>;
  firstAudioLine: string;
}

const STORY_ONBOARDING: Record<string, StoryOnboarding> = {
  "the-call": {
    scenes: [
      {
        image: "/images/stories/the-call/scene-1.png",
        text: "Your phone rings. An unknown number. You answer.",
      },
      {
        image: "/images/stories/the-call/scene-2.png",
        text: "On the other end — someone trapped in a concrete room underground. They need your help to escape.",
      },
      {
        image: "/images/stories/the-call/scene-3.png",
        text: "'Please don't hang up. I don't know where I am.' Guide them out. Your voice is all they have.",
      },
    ],
    firstAudioLine: "Hello?? Oh god, someone picked up. Please — please don't hang up.",
  },
  "the-lighthouse": {
    scenes: [
      {
        image: "/images/stories/the-lighthouse/scene-1.webp",
        text: "A storm is building off the coast. You're alone in the lighthouse. The radio hasn't made a sound in weeks.",
      },
      {
        image: "/images/stories/the-lighthouse/scene-2.webp",
        text: "The radio crackles. A voice: 'Hello? Is someone there?'",
      },
    ],
    firstAudioLine: "Hello? Is someone there? Thank god. We're taking on water.",
  },
  "room-4b": {
    scenes: [
      {
        image: "/images/stories/room-4b/scene-1.webp",
        text: "St. Maren's Hospital. Decommissioned. Your shift starts at midnight.",
      },
      {
        image: "/images/stories/room-4b/scene-2.webp",
        text: "You step into the hallway. The fluorescent light flickers twice, then holds.",
      },
    ],
    firstAudioLine:
      "You step into the hallway. The fluorescent light flickers twice, then holds. Your shift has begun.",
  },
  "the-last-session": {
    scenes: [
      {
        image: "/images/stories/the-last-session/scene-1.png",
        text: "You are a therapist. It's late. Your last patient has arrived.",
      },
      {
        image: "/images/stories/the-last-session/scene-2.png",
        text: "She sits across from you. Something about her feels... familiar.",
      },
      {
        image: "/images/stories/the-last-session/scene-3.png",
        text: "The door locks behind her. The session has begun.",
      },
    ],
    firstAudioLine: "... Hello, Doctor. Thank you for seeing me tonight.",
  },
};

type OnboardingStep = "scene" | "headphones" | "countdown" | "ringing";

interface OnboardingFlowProps {
  storyId: string;
  customOnboarding?: StoryOnboarding;
  isSessionReady?: boolean;
  adaptiveMusicAvailable?: boolean;
  enableAdaptiveMusic?: boolean;
  onToggleAdaptiveMusic?: () => void;
  onPrepare?: () => void;
  onComplete: () => void;
}

export function OnboardingFlow({
  storyId,
  customOnboarding,
  isSessionReady = true,
  adaptiveMusicAvailable = false,
  enableAdaptiveMusic = false,
  onToggleAdaptiveMusic,
  onPrepare,
  onComplete,
}: OnboardingFlowProps) {
  const onboarding = customOnboarding ?? STORY_ONBOARDING[storyId] ?? STORY_ONBOARDING[DEFAULT_STORY_ID];
  const totalScenes = onboarding.scenes.length;

  const [step, setStep] = useState<OnboardingStep>("scene");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [showContinue, setShowContinue] = useState(false);
  const [continueOpacity, setContinueOpacity] = useState(0);
  const [textOpacity, setTextOpacity] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const prepareTriggeredRef = useRef(false);
  const ringFinishedRef = useRef(false);
  const ringCompletionTriggeredRef = useRef(false);

  const currentScene = onboarding.scenes[sceneIndex];

  // ── Delayed text fade-in (1s after scene loads) ──────────────
  useEffect(() => {
    if (step !== "scene") return;
    const timer = setTimeout(() => setTextOpacity(1), 800);
    return () => clearTimeout(timer);
  }, [step, sceneIndex]);

  // ── Delayed continue button (invisible 4s, fade in 1s) ──────
  useEffect(() => {
    if (step !== "scene") return;
    const showTimer = setTimeout(() => {
      setShowContinue(true);
      // Start opacity fade after showing
      requestAnimationFrame(() => {
        setContinueOpacity(1);
      });
    }, 4000);

    return () => clearTimeout(showTimer);
  }, [step, sceneIndex]);

  // ── Countdown timer ──────────────────────────────────────────
  useEffect(() => {
    if (step !== "countdown") return;
    let transitionTimer: ReturnType<typeof setTimeout> | null = null;
    const timer = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(0);
        // "the-call" story: phone rings before session starts
        transitionTimer = setTimeout(() => {
          if (storyId === "the-call") {
            if (!prepareTriggeredRef.current) {
              prepareTriggeredRef.current = true;
              onPrepare?.();
            }
            setStep("ringing");
          } else {
            onComplete();
          }
        }, 0);
        return;
      }
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => {
      clearTimeout(timer);
      if (transitionTimer) clearTimeout(transitionTimer);
    };
  }, [step, countdown, onComplete, onPrepare, storyId]);

  // ── Phone ringing phase (the-call only) ────────────────────
  // Plays a North American ring tone (440Hz + 480Hz) for one cycle,
  // then silence, then starts the session. Creates the moment of
  // "phone ringing → someone picks up → Alex speaks".
  useEffect(() => {
    if (step !== "ringing") return;
    ringFinishedRef.current = false;
    ringCompletionTriggeredRef.current = false;

    let ctx: AudioContext | null = null;
    try {
      ctx = new AudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      // North American ring tone: 440Hz + 480Hz
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      osc1.type = "sine";
      osc2.type = "sine";
      gain.gain.value = 0.12;

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      // Ring for 2 seconds with fade-out at the end
      osc1.start(now);
      osc2.start(now);
      gain.gain.setValueAtTime(0.12, now + 1.7);
      gain.gain.linearRampToValueAtTime(0, now + 2);
      osc1.stop(now + 2);
      osc2.stop(now + 2);
    } catch {
      // AudioContext failed — proceed without ring
      console.warn("[ONBOARDING] Could not play phone ring");
    }

    // 2s ring + 2s silence = 4s before handoff to gameplay.
    const timer = setTimeout(() => {
      ctx?.close().catch(() => {});
      if (storyId !== "the-call") {
        ringCompletionTriggeredRef.current = true;
        onComplete();
        return;
      }
      ringFinishedRef.current = true;
      if (isSessionReady && !ringCompletionTriggeredRef.current) {
        ringCompletionTriggeredRef.current = true;
        onComplete();
      }
    }, 4000);

    return () => {
      clearTimeout(timer);
      ctx?.close().catch(() => {});
    };
  }, [isSessionReady, onComplete, step, storyId]);

  useEffect(() => {
    if (step !== "ringing") return;
    if (storyId !== "the-call") return;
    if (!ringFinishedRef.current) return;
    if (!isSessionReady) return;
    if (ringCompletionTriggeredRef.current) return;
    ringCompletionTriggeredRef.current = true;
    onComplete();
  }, [isSessionReady, onComplete, step, storyId]);

  const advance = useCallback(() => {
    if (step === "scene") {
      if (sceneIndex < totalScenes - 1) {
        // Reset scene UI state before moving to the next scene.
        setTextOpacity(0);
        setShowContinue(false);
        setContinueOpacity(0);
        setSceneIndex((prev) => prev + 1);
      } else {
        setStep("headphones");
      }
    } else if (step === "headphones") {
      if (!prepareTriggeredRef.current) {
        prepareTriggeredRef.current = true;
        onPrepare?.();
      }
      setStep("countdown");
    }
  }, [onPrepare, step, sceneIndex, totalScenes]);

  // ── Scene step: image + text + delayed continue ──────────────
  if (step === "scene" && currentScene) {
    return (
      <div
        className="fade-in"
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "var(--black)",
          zIndex: 100,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Scene image — landscape 16:9 */}
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "min(90vw, 600px)",
            aspectRatio: "16 / 9",
            maxHeight: "calc(100dvh - 250px)",
            overflow: "hidden",
            borderRadius: 0,
          }}
        >
          {currentScene.image ? (
            <>
              <Image
                src={currentScene.image}
                alt=""
                fill
                sizes="(max-width: 600px) 90vw, 600px"
                style={{ objectFit: "cover" }}
                priority
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 40%, transparent 100%)",
                }}
              />
            </>
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(circle at 20% 20%, rgba(232,148,60,0.14), transparent 35%), radial-gradient(circle at 80% 30%, rgba(255,255,255,0.08), transparent 30%), linear-gradient(180deg, rgba(18,18,18,1), rgba(0,0,0,1))",
              }}
            />
          )}
        </div>

        {/* Scene text */}
        <p
          style={{
            maxWidth: 480,
            textAlign: "center",
            padding: "var(--space-md) var(--space-sm)",
            color: "var(--muted)",
            fontSize: "var(--type-body)",
            fontFamily: "var(--font-literary)",
            fontStyle: "italic",
            lineHeight: 1.6,
            opacity: textOpacity,
            transition: "opacity 1.5s ease",
          }}
        >
          {currentScene.text}
        </p>

        {/* Continue button — invisible for 4s, fades in over 1s */}
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {showContinue && (
            <button
              type="button"
              onClick={advance}
              style={{
                background: "none",
                border: "1px solid var(--muted)",
                color: "var(--white)",
                fontSize: "var(--type-body)",
                fontFamily: "var(--font-ui)",
                cursor: "pointer",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                opacity: continueOpacity,
                transition: "opacity 1s ease",
                padding: "var(--space-sm) var(--space-lg)",
                minHeight: "var(--touch-min)",
                minWidth: 140,
              }}
            >
              Continue
            </button>
          )}
        </div>

        {/* Scene indicators */}
        {totalScenes > 1 && (
          <div
            style={{
              marginTop: "var(--space-xs)",
              display: "flex",
              gap: "var(--space-xs)",
              minHeight: 10,
              alignItems: "center",
            }}
          >
            {onboarding.scenes.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor:
                    i <= sceneIndex
                      ? "var(--accent)"
                      : "var(--muted)",
                  opacity: i <= sceneIndex ? 1 : 0.3,
                  transition: "var(--transition-normal)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Headphones step ──────────────────────────────────────────
  if (step === "headphones") {
    return (
      <div
        className="fade-in"
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--black)",
          zIndex: 100,
          padding: "var(--space-lg)",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "var(--type-lead)",
            fontWeight: 400,
            fontFamily: "var(--font-display)",
            marginBottom: "var(--space-sm)",
            color: "var(--white)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          PUT ON HEADPHONES
        </h2>
        <p
          style={{
            fontSize: "var(--type-body)",
            fontFamily: "var(--font-literary)",
            fontStyle: "italic",
            color: "var(--muted)",
            marginBottom: "var(--space-lg)",
            maxWidth: "28ch",
          }}
        >
          speak naturally. listen closely.
        </p>
        <button
          type="button"
          onClick={advance}
          style={{
            minHeight: "var(--touch-min)",
            padding: "var(--space-sm) var(--space-xl)",
            border: "1px solid var(--accent)",
            borderRadius: 0,
            color: "var(--accent)",
            fontSize: "var(--type-title)",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            transition: "var(--transition-normal)",
            backgroundColor: "transparent",
            cursor: "pointer",
            minWidth: 180,
          }}
        >
          BEGIN
        </button>
        <button
          type="button"
          onClick={onToggleAdaptiveMusic}
          disabled={!adaptiveMusicAvailable}
          style={{
            minHeight: "var(--touch-min)",
            marginTop: "var(--space-sm)",
            padding: "var(--space-xs) var(--space-md)",
            border: "1px solid var(--muted)",
            borderRadius: 0,
            color: "var(--muted)",
            fontSize: "var(--type-caption)",
            fontFamily: "var(--font-ui)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            transition: "var(--transition-normal)",
            backgroundColor: "transparent",
            cursor: adaptiveMusicAvailable ? "pointer" : "not-allowed",
            minWidth: 240,
            opacity: adaptiveMusicAvailable ? 0.85 : 0.5,
          }}
          aria-pressed={enableAdaptiveMusic}
        >
          Adaptive Music (Experimental): {adaptiveMusicAvailable ? (enableAdaptiveMusic ? "On" : "Off") : "Unavailable"}
        </button>
      </div>
    );
  }

  // ── Ringing step (the-call only) — pure black, phone ring plays ──
  if (step === "ringing") {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "var(--black)",
          zIndex: 100,
        }}
      />
    );
  }

  // ── Countdown step ───────────────────────────────────────────
  return (
    <div
      className="fade-in"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--black)",
        zIndex: 100,
        padding: "var(--space-lg)",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontSize: "var(--type-lead)",
          color: "var(--muted)",
          marginBottom: "var(--space-lg)",
          fontFamily: "var(--font-literary)",
          fontStyle: "italic",
        }}
      >
        close your eyes
      </p>
      <div
        style={{
          fontSize: "var(--type-hero)",
          color: "var(--accent)",
          fontFamily: "var(--font-display)",
          fontWeight: 400,
        }}
      >
        {countdown}
      </div>
    </div>
  );
}
