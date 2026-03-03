"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { FogLayer } from "@/components/ui/FogLayer";
import { NavigationChrome } from "@/components/ui/NavigationChrome";
import { FullScreenMenu } from "@/components/ui/FullScreenMenu";
import { TransitionLink } from "@/components/ui/TransitionLink";
import { STORIES, COMING_SOON_COUNT } from "@/lib/story-data";

const CARD_HOVER_CSS = [
  ".story-card { border: 1px solid transparent; transition: border-color 0.3s ease; max-height: 520px; }",
  ".story-card.playable:hover { border-color: var(--accent); }",
  ".story-card .card-hover { opacity: 0; transition: opacity 0.3s ease; }",
  ".story-card:hover .card-hover { opacity: 1; }",
  "@media (max-width: 1023px) { .story-card .card-hover { opacity: 1; } }",
  "@media (min-width: 1024px) { .stories-grid { grid-template-columns: repeat(2, 1fr) !important; } }",
  "@media (max-width: 1023px) { .stories-section { padding-left: var(--space-sm) !important; padding-right: var(--space-sm) !important; } }",
  "@media (max-width: 767px) { .story-card { max-height: 65vh; } }",
  "@keyframes scroll-hint { 0%, 100% { opacity: 0.3; transform: translateY(0); } 50% { opacity: 0.6; transform: translateY(6px); } }",
  ".scroll-hint { animation: scroll-hint 2.5s ease-in-out infinite; }",
].join("\n");

// ── Waitlist Modal ──────────────────────────────────────────────────────────

function WaitlistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  // Replace with actual Google Form URL
  const googleFormUrl = process.env.NEXT_PUBLIC_GOOGLE_FORM_URL || "";

  function handleJoin() {
    if (googleFormUrl) {
      window.open(googleFormUrl, "_blank", "noopener,noreferrer");
    }
    onClose();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Join waiting list"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(0,0,0,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-md)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 480,
          background: "var(--black)",
          border: "1px solid var(--muted)",
          padding: "56px 40px",
          borderRadius: 0,
          textAlign: "center",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "var(--space-sm)",
            right: "var(--space-sm)",
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            fontFamily: "var(--font-display)",
            fontSize: "var(--type-body)",
            letterSpacing: "1px",
            cursor: "pointer",
            minHeight: 48,
            minWidth: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          CLOSE
        </button>

        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--type-lead)",
            color: "var(--white)",
            letterSpacing: "3px",
            margin: 0,
            marginBottom: "var(--space-md)",
            lineHeight: 1,
          }}
        >
          COMING SOON
        </h2>
        <p
          style={{
            fontFamily: "var(--font-literary)",
            fontSize: "var(--type-title)",
            color: "var(--muted)",
            fontStyle: "italic",
            margin: 0,
            marginBottom: "var(--space-lg)",
            lineHeight: 1.6,
          }}
        >
          This story isn&apos;t available yet. Join the waiting list to be
          first to play when we launch.
        </p>

        {googleFormUrl ? (
          <button
            onClick={handleJoin}
            style={{
              width: "100%",
              height: 56,
              background: "transparent",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-body)",
              letterSpacing: "3px",
              cursor: "pointer",
              borderRadius: 0,
            }}
          >
            JOIN WAITLIST
          </button>
        ) : (
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--type-ui)",
              color: "var(--muted)",
              margin: 0,
              opacity: 0.6,
            }}
          >
            Waitlist opening soon. Stay tuned.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Home ────────────────────────────────────────────────────────────────────

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const stories = STORIES.filter((s) => !s.comingSoon);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: CARD_HOVER_CSS,
        }}
      />

      <WaitlistModal open={waitlistOpen} onClose={() => setWaitlistOpen(false)} />

      <main id="main-content">
        {/* Section 1: Hero — full viewport */}
        <section
          style={{
            position: "relative",
            width: "100%",
            height: "100dvh",
            overflow: "hidden",
            background: "var(--black)",
          }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: 0.3,
              zIndex: 0,
            }}
          >
            <source src="/video/landing-bg.mp4" type="video/mp4" />
          </video>

          <FogLayer />

          <div
            style={{
              position: "relative",
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              padding: "var(--space-sm)",
            }}
          >
            <style
              dangerouslySetInnerHTML={{
                __html:
                  "@media(max-width:400px){.landing-title{letter-spacing:2px!important}}",
              }}
            />
            <motion.h1
              className="landing-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.6, ease: "easeOut" }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--type-hero)",
                color: "var(--white)",
                lineHeight: 1,
                letterSpacing: "6px",
                margin: 0,
              }}
            >
              INNERPLAY
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 1.2, ease: "easeOut" }}
              style={{
                fontFamily: "var(--font-literary)",
                fontSize: "var(--type-body)",
                color: "var(--muted)",
                fontStyle: "italic",
                margin: 0,
                marginBlockStart: "var(--space-sm)",
              }}
            >
              close your eyes. speak. play.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 1.6, ease: "easeOut" }}
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--type-ui)",
                color: "var(--muted)",
                margin: 0,
                marginBlockStart: "var(--space-sm)",
                maxWidth: 360,
                lineHeight: 1.6,
                opacity: 0.7,
              }}
            >
              A new kind of game. No screen. No UI. Just your voice and your
              imagination.
            </motion.p>

          </div>

          {/* Scroll-down indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 2.4 }}
            className="scroll-hint"
            style={{
              position: "absolute",
              bottom: "var(--space-lg)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 3,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-xs)",
              cursor: "pointer",
              pointerEvents: "auto",
            }}
            onClick={() => {
              document
                .getElementById("stories")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <svg
              width="20"
              height="12"
              viewBox="0 0 20 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M1 1L10 10L19 1"
                stroke="var(--muted)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        </section>

        {/* Section 2: Stories Catalogue */}
        <section
          id="stories"
          className="stories-section"
          style={{
            padding: "var(--space-xl) var(--space-lg)",
            background: "var(--black)",
            minHeight: "100dvh",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-section)",
              color: "var(--white)",
              letterSpacing: "1px",
              lineHeight: 1,
              marginTop: 0,
              marginBottom: "var(--space-md)",
            }}
          >
            STORIES
          </h2>

          {/* Featured: Play The Call */}
          <div
            style={{
              marginBottom: "var(--space-lg)",
              padding: "var(--space-md)",
              border: "1px solid var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "var(--space-sm)",
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-literary)",
                  fontSize: "var(--type-title)",
                  color: "var(--white)",
                  fontWeight: 400,
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                The Call
              </h3>
              <p
                style={{
                  fontFamily: "var(--font-literary)",
                  fontSize: "var(--type-body)",
                  color: "var(--muted)",
                  fontStyle: "italic",
                  margin: 0,
                  marginTop: 4,
                }}
              >
                A stranger calls from underground. Guide them out. Your voice is all they have.
              </p>
            </div>
            <TransitionLink
              href="/play?story=the-call"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--type-title)",
                color: "var(--accent)",
                letterSpacing: "3px",
                textDecoration: "none",
                minHeight: 48,
                padding: "0 var(--space-md)",
                display: "inline-flex",
                alignItems: "center",
                border: "1px solid var(--accent)",
                whiteSpace: "nowrap",
              }}
            >
              PLAY NOW
            </TransitionLink>
          </div>

          <div
            className="stories-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(1, 1fr)",
              gap: "var(--space-md)",
            }}
          >
            {stories.map((story, i) => {
              const cardInner = (
                <div
                  className={`story-card${story.playable ? " playable" : ""}`}
                  style={{
                    position: "relative",
                    aspectRatio: "2 / 3",
                    overflow: "hidden",
                    borderRadius: 0,
                    background: "var(--black)",
                    opacity: story.playable ? 1 : 0.6,
                    cursor: story.playable ? "pointer" : "pointer",
                  }}
                >
                  <Image
                    src={story.image}
                    alt={story.title}
                    fill
                    sizes="(max-width: 1023px) 100vw, 50vw"
                    style={{ objectFit: "cover" }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 40%, transparent)",
                    }}
                  />

                  {/* Lock badge for non-playable stories */}
                  {!story.playable && (
                    <div
                      style={{
                        position: "absolute",
                        top: "var(--space-sm)",
                        right: "var(--space-sm)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <svg
                        width="12"
                        height="14"
                        viewBox="0 0 12 14"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <rect
                          x="1"
                          y="6"
                          width="10"
                          height="7"
                          rx="0.5"
                          stroke="var(--muted)"
                          strokeWidth="1.2"
                        />
                        <path
                          d="M3.5 6V4a2.5 2.5 0 0 1 5 0v2"
                          stroke="var(--muted)"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                        <circle cx="6" cy="9.5" r="1" fill="var(--muted)" />
                      </svg>
                      <span
                        style={{
                          fontFamily: "var(--font-ui)",
                          fontSize: "var(--type-caption)",
                          color: "var(--muted)",
                          letterSpacing: "1px",
                        }}
                      >
                        COMING SOON
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      padding: "var(--space-md)",
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: "var(--font-literary)",
                        fontSize: "var(--type-title)",
                        color: "var(--white)",
                        fontWeight: 400,
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {story.title}
                    </h3>
                    <p
                      className="card-hover"
                      style={{
                        fontFamily: "var(--font-literary)",
                        fontSize: "var(--type-body)",
                        color: "var(--muted)",
                        fontStyle: "italic",
                        margin: 0,
                        marginTop: "var(--space-xs)",
                      }}
                    >
                      {story.hook}
                    </p>
                    <p
                      className="card-hover"
                      style={{
                        fontFamily: "var(--font-ui)",
                        fontSize: "var(--type-caption)",
                        color: "var(--muted)",
                        margin: 0,
                        marginTop: "var(--space-xs)",
                      }}
                    >
                      {story.genre} · {story.duration}
                    </p>
                  </div>
                </div>
              );

              return (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                >
                  {story.playable ? (
                    <TransitionLink
                      href={`/play?story=${story.id}`}
                      style={{ display: "block", textDecoration: "none" }}
                    >
                      {cardInner}
                    </TransitionLink>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label={`${story.title} — coming soon. Join waiting list.`}
                      onClick={() => setWaitlistOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setWaitlistOpen(true);
                        }
                      }}
                      style={{ display: "block", textDecoration: "none" }}
                    >
                      {cardInner}
                    </div>
                  )}
                </motion.div>
              );
            })}

            {/* Coming Soon placeholders */}
            {Array.from({ length: COMING_SOON_COUNT }).map((_, i) => (
              <div
                key={`coming-soon-${i}`}
                role="button"
                tabIndex={0}
                aria-label="More stories coming soon. Join waiting list."
                onClick={() => setWaitlistOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setWaitlistOpen(true);
                  }
                }}
                style={{
                  position: "relative",
                  aspectRatio: "2 / 3",
                  maxHeight: 520,
                  borderRadius: 0,
                  border: "1px dashed var(--muted)",
                  background: "var(--black)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "var(--space-sm)",
                  cursor: "pointer",
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ opacity: 0.4 }}
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="1"
                    stroke="var(--muted)"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M7 11V7a5 5 0 0 1 10 0v4"
                    stroke="var(--muted)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="16" r="1.5" fill="var(--muted)" />
                </svg>
                <span
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--type-caption)",
                    color: "var(--muted)",
                    letterSpacing: "1px",
                  }}
                >
                  more darkness coming
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Create Your Own */}
        <section
          style={{
            padding: "var(--space-xl) var(--space-lg)",
            background: "var(--black)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-section)",
              color: "var(--white)",
              letterSpacing: "2px",
              lineHeight: 1,
              marginTop: 0,
              marginBottom: "var(--space-xs)",
            }}
          >
            CREATE YOUR OWN
          </h2>
          <p
            style={{
              fontFamily: "var(--font-literary)",
              fontSize: "var(--type-body)",
              color: "var(--muted)",
              fontStyle: "italic",
              margin: 0,
              marginBottom: "var(--space-md)",
            }}
          >
            Build your own interactive story with the creator interview.
          </p>
          <a
            href="/create"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "1px solid var(--accent)",
              color: "var(--accent)",
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-ui)",
              letterSpacing: "2px",
              height: 48,
              padding: "0 var(--space-md)",
              borderRadius: 0,
              textDecoration: "none",
            }}
          >
            OPEN CREATOR
          </a>
        </section>

        {/* Section 4: About */}
        <section
          id="about"
          style={{
            padding: "var(--space-xl) var(--space-lg)",
            background: "var(--black)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            maxWidth: 680,
            margin: "0 auto",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-section)",
              color: "var(--white)",
              letterSpacing: "2px",
              lineHeight: 1,
              marginTop: 0,
              marginBottom: "var(--space-md)",
            }}
          >
            ABOUT
          </h2>
          <p
            style={{
              fontFamily: "var(--font-literary)",
              fontSize: "var(--type-body)",
              color: "var(--muted)",
              fontStyle: "italic",
              lineHeight: 1.8,
              margin: 0,
              marginBottom: "var(--space-md)",
            }}
          >
            InnerPlay is a new kind of interactive entertainment — voice-powered
            storytelling you experience with your eyes closed. No screen. No UI.
            Just your voice, your imagination, and an AI character who responds to
            everything you say.
          </p>
          <p
            style={{
              fontFamily: "var(--font-literary)",
              fontSize: "var(--type-body)",
              color: "var(--muted)",
              fontStyle: "italic",
              lineHeight: 1.8,
              margin: 0,
              marginBottom: "var(--space-md)",
            }}
          >
            Stories adapt to how you play — not just what you choose, but how you
            speak, how long you pause, and what kind of person you are. Every
            session is different. Every player gets a different story.
          </p>
          <p
            style={{
              fontFamily: "var(--font-literary)",
              fontSize: "var(--type-body)",
              color: "var(--muted)",
              fontStyle: "italic",
              lineHeight: 1.8,
              margin: 0,
              marginBottom: "var(--space-lg)",
            }}
          >
            Powered by Gemini Live API for real-time voice generation and three-layer
            spatial audio. Built for the Gemini Live Agent Challenge 2026.
          </p>
          <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
            <a
              href="https://www.linkedin.com/in/akash-manmohan-776bba1a1/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--type-ui)",
                color: "var(--accent)",
                letterSpacing: "1px",
                textDecoration: "none",
                minHeight: 48,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              AKASH MANMOHAN — LINKEDIN ↗
            </a>
            <a
              href="https://github.com/AkashiGhost/gemini"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "var(--font-ui)",
                fontSize: "var(--type-ui)",
                color: "var(--muted)",
                letterSpacing: "1px",
                textDecoration: "none",
                minHeight: 48,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              GITHUB ↗
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            padding: "var(--space-xl) 0",
            textAlign: "center",
            background: "var(--black)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-ui)",
              color: "var(--muted)",
              opacity: 0.3,
              letterSpacing: "3px",
            }}
          >
            INNERPLAY
          </span>
        </footer>
      </main>

      {/* Navigation chrome */}
      <NavigationChrome
        variant="landing"
        onMenuToggle={() => setMenuOpen((prev) => !prev)}
        menuOpen={menuOpen}
      />

      {/* Full-screen menu */}
      <FullScreenMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
