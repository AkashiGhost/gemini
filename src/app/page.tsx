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
  "@media (min-width: 768px) { .how-it-works-grid { grid-template-columns: repeat(3, 1fr) !important; } }",
  "@media (min-width: 768px) { .why-grid { grid-template-columns: repeat(2, 1fr) !important; } }",
  "@media (min-width: 1024px) { .why-grid { grid-template-columns: repeat(4, 1fr) !important; } }",
  "@media (min-width: 600px) { .powered-grid { grid-template-columns: repeat(3, 1fr) !important; } }",
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
              The platform for audio-only interactive stories. Eyes closed, voice only.
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
                maxWidth: 380,
                lineHeight: 1.6,
                opacity: 0.7,
              }}
            >
              Voice-only generative storytelling. No screen. No UI. Plug in headphones,
              speak, and be transported into a living story in seconds.
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

        {/* Section 2: How It Works */}
        <section
          style={{
            padding: "var(--space-xl) var(--space-lg)",
            background: "var(--black)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-section)",
              color: "var(--white)",
              letterSpacing: "2px",
              lineHeight: 1,
              marginTop: 0,
              marginBottom: "var(--space-lg)",
              textAlign: "center",
            }}
          >
            HOW IT WORKS
          </motion.h2>

          <div
            className="how-it-works-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "var(--space-md)",
              maxWidth: 860,
              margin: "0 auto",
            }}
          >
            {[
              {
                step: "01",
                title: "Put on headphones",
                body: "Full immersion requires full audio. Stereo or better. Close the door. The outside world stops here.",
              },
              {
                step: "02",
                title: "Close your eyes and speak",
                body: "No buttons. No menus. Just your voice. The AI hears you in real time and responds as a living character.",
              },
              {
                step: "03",
                title: "Your story unfolds",
                body: "Every word you say shapes what happens next. The story adapts to you — your tone, your choices, your silences.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                style={{
                  padding: "var(--space-md)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-xs)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--type-lead)",
                    color: "var(--accent)",
                    lineHeight: 1,
                    letterSpacing: "2px",
                  }}
                >
                  {item.step}
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--type-section)",
                    color: "var(--white)",
                    letterSpacing: "1px",
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {item.title.toUpperCase()}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-literary)",
                    fontSize: "var(--type-body)",
                    color: "var(--muted)",
                    fontStyle: "italic",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {item.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 3: Stories Catalogue */}
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
                  more stories coming
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Why InnerPlay */}
        <section
          style={{
            padding: "var(--space-xl) var(--space-lg)",
            background: "var(--black)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-section)",
              color: "var(--white)",
              letterSpacing: "2px",
              lineHeight: 1,
              marginTop: 0,
              marginBottom: "var(--space-xs)",
              textAlign: "center",
            }}
          >
            WHY INNERPLAY
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.15 }}
            style={{
              fontFamily: "var(--font-literary)",
              fontSize: "var(--type-body)",
              color: "var(--muted)",
              fontStyle: "italic",
              textAlign: "center",
              marginTop: 0,
              marginBottom: "var(--space-lg)",
            }}
          >
            You already have the most powerful imagination engine ever built. We just give it a story to run.
          </motion.p>

          <div
            className="why-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "var(--space-md)",
              maxWidth: 1080,
              margin: "0 auto",
            }}
          >
            {[
              {
                label: "NOT ANOTHER SCREEN",
                body: "Traditional games demand your eyes for hours. InnerPlay demands nothing but your ears and your imagination. Play on a walk. Play before sleep.",
              },
              {
                label: "NOT A CHOOSE-YOUR-OWN-ADVENTURE",
                body: "There are no menus, no dialogue trees, no buttons. You speak in full sentences. The AI character listens, responds, and remembers everything.",
              },
              {
                label: "NOT PASSIVE AUDIO",
                body: "Meditation apps ask you to listen. InnerPlay asks you to act. Every story needs your voice to move forward — you are the protagonist.",
              },
              {
                label: "NOT A 100-HOUR COMMITMENT",
                body: "Each story is 10 minutes. Sharp, complete, and designed to leave a mark. No save files. No grind. Just one intense experience, fully yours.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{
                  padding: "var(--space-md)",
                  borderLeft: "2px solid var(--accent)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--type-ui)",
                    color: "var(--accent)",
                    letterSpacing: "2px",
                    lineHeight: 1,
                    margin: 0,
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {item.label}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-literary)",
                    fontSize: "var(--type-body)",
                    color: "var(--muted)",
                    fontStyle: "italic",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {item.body}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 6: Powered By */}
        <section
          style={{
            padding: "var(--space-xl) var(--space-lg)",
            background: "var(--black)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-section)",
              color: "var(--white)",
              letterSpacing: "2px",
              lineHeight: 1,
              marginTop: 0,
              marginBottom: "var(--space-lg)",
              textAlign: "center",
            }}
          >
            POWERED BY
          </motion.h2>

          <div
            className="powered-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "1px",
              maxWidth: 860,
              margin: "0 auto",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {[
              {
                name: "GEMINI LIVE API",
                detail: "Real-time voice AI with sub-second latency. The character hears you and responds before you finish your thought.",
              },
              {
                name: "GOOGLE CLOUD",
                detail: "Enterprise-grade infrastructure. Every session is private, streamed live, and never stored.",
              },
              {
                name: "THREE-LAYER SPATIAL AUDIO",
                detail: "Ambient soundscape, character voice, and reactive audio cues — mixed in real time to match exactly what is happening in your story.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                style={{
                  padding: "var(--space-md)",
                  background: "var(--black)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--type-section)",
                    color: "var(--white)",
                    letterSpacing: "2px",
                    lineHeight: 1,
                    margin: 0,
                    marginBottom: "var(--space-xs)",
                  }}
                >
                  {item.name}
                </h3>
                <p
                  style={{
                    fontFamily: "var(--font-literary)",
                    fontSize: "var(--type-body)",
                    color: "var(--muted)",
                    fontStyle: "italic",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {item.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Section 7: Create Your Own */}
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

        {/* Section 8: About */}
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
            8 billion people walk around with the most powerful imagination engine
            ever created — and we use it to scroll. InnerPlay exists to fix that.
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
            We are building the only product that combines eyes-closed voice
            conversation, immersive spatial audio, and generative storytelling
            into a single experience. No screen. No UI. More immersive than VR —
            because the brain renders everything.
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
            Built by Akash Manmohan for the Gemini Live Agent Challenge 2026.
            Powered by Gemini Live API, real-time voice generation, and three-layer
            spatial audio.
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
            padding: "var(--space-xl) var(--space-lg)",
            paddingTop: "calc(var(--space-xl) * 1.5)",
            background: "var(--black)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            textAlign: "center",
          }}
        >
          {/* Wordmark */}
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-section)",
              color: "var(--muted)",
              opacity: 0.3,
              letterSpacing: "4px",
              marginBottom: "var(--space-md)",
            }}
          >
            INNERPLAY
          </span>

          {/* Attribution */}
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--type-caption)",
              color: "var(--muted)",
              opacity: 0.5,
              letterSpacing: "0.5px",
              margin: 0,
              marginBottom: "var(--space-xs)",
              lineHeight: 1.6,
            }}
          >
            Built for the Gemini Live Agent Challenge 2026
          </p>
          <p
            style={{
              fontFamily: "var(--font-ui)",
              fontSize: "var(--type-caption)",
              color: "var(--muted)",
              opacity: 0.5,
              letterSpacing: "0.5px",
              margin: 0,
              marginBottom: "var(--space-md)",
              lineHeight: 1.6,
            }}
          >
            Powered by Google Gemini
          </p>

          {/* Separator */}
          <div
            style={{
              width: 32,
              height: 1,
              background: "rgba(255,255,255,0.08)",
              margin: "0 auto var(--space-md)",
            }}
          />

          {/* Legal + GitHub links */}
          <nav
            aria-label="Legal links"
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-sm)",
            }}
          >
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Terms of Service", href: "/terms" },
              { label: "Cookie Policy", href: "/cookies" },
              { label: "GitHub", href: "#" },
            ].map((link, i, arr) => (
              <span
                key={link.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-sm)",
                }}
              >
                <a
                  href={link.href}
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: "var(--type-caption)",
                    color: "var(--muted)",
                    opacity: 0.5,
                    textDecoration: "none",
                    letterSpacing: "0.5px",
                    transition: "opacity var(--transition-fast)",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.9")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.opacity = "0.5")
                  }
                >
                  {link.label}
                </a>
                {i < arr.length - 1 && (
                  <span
                    aria-hidden="true"
                    style={{
                      color: "var(--muted)",
                      opacity: 0.2,
                      fontSize: "var(--type-caption)",
                      userSelect: "none",
                    }}
                  >
                    /
                  </span>
                )}
              </span>
            ))}
          </nav>
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
