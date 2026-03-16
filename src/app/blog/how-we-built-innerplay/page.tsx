import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How We Built InnerPlay — Gemini Live Agent Challenge",
  description:
    "Building the first game you play with your eyes closed — for the Gemini Live Agent Challenge. A developer's honest account of architecture, hard lessons, and what voice-first AI taught us.",
  openGraph: {
    title: "How We Built InnerPlay",
    description:
      "Building the first game you play with your eyes closed — for the Gemini Live Agent Challenge.",
    type: "article",
  },
};

export default function HowWeBuiltInnerPlay() {
  return (
    <main
      style={{
        backgroundColor: "#000",
        color: "#fff",
        minHeight: "100dvh",
        overflowX: "hidden",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {/* Back nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid #1a1a1a",
        }}
      >
        <a
          href="/"
          style={{
            color: "#E8943C",
            fontFamily: "Georgia, serif",
            fontSize: "0.85rem",
            letterSpacing: "0.2em",
            textTransform: "uppercase" as const,
            textDecoration: "none",
          }}
        >
          ← InnerPlay
        </a>
      </nav>

      {/* Hero */}
      <header
        style={{
          paddingTop: "8rem",
          paddingBottom: "4rem",
          paddingLeft: "clamp(1.5rem, 6vw, 8rem)",
          paddingRight: "clamp(1.5rem, 6vw, 8rem)",
          maxWidth: "880px",
          margin: "0 auto",
        }}
      >
        <p
          style={{
            fontSize: "0.78rem",
            letterSpacing: "0.3em",
            color: "#E8943C",
            textTransform: "uppercase" as const,
            marginBottom: "1.25rem",
            fontFamily: "Georgia, serif",
          }}
        >
          Gemini Live Agent Challenge 2026 &nbsp;·&nbsp; Dev Journal
        </p>

        <h1
          style={{
            fontSize: "clamp(3rem, 10vw, 7rem)",
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            color: "#fff",
            marginBottom: "1.5rem",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          How We Built{" "}
          <span style={{ color: "#E8943C" }}>InnerPlay</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(1.1rem, 2.5vw, 1.4rem)",
            fontWeight: 300,
            lineHeight: 1.6,
            color: "#999",
            maxWidth: "58ch",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
          }}
        >
          Building the first game you play with your eyes closed — for the
          Gemini Live Agent Challenge
        </p>

        <div
          style={{
            marginTop: "3rem",
            height: "1px",
            background: "linear-gradient(to right, #E8943C, transparent)",
            width: "120px",
          }}
        />
      </header>

      {/* Article body */}
      <article
        style={{
          maxWidth: "880px",
          margin: "0 auto",
          paddingLeft: "clamp(1.5rem, 6vw, 8rem)",
          paddingRight: "clamp(1.5rem, 6vw, 8rem)",
          paddingBottom: "6rem",
        }}
      >
        {/* Disclosure */}
        <div
          style={{
            border: "1px solid #1e1e1e",
            borderLeft: "3px solid #E8943C",
            padding: "1rem 1.25rem",
            marginBottom: "3.5rem",
            backgroundColor: "#090909",
          }}
        >
          <p
            style={{
              fontSize: "0.95rem",
              color: "#777",
              fontStyle: "italic",
              lineHeight: 1.6,
              fontFamily: "Georgia, serif",
            }}
          >
            This piece of content was created for the purposes of entering the
            Gemini Live Agent Challenge hackathon.
          </p>
        </div>

        {/* Section 1 — The Spark */}
        <BlogSection label="01" title="The Spark">
          <BlogP>
            I&apos;m an imaginative person. Every night before sleep, I&apos;d
            close my eyes and let my mind build worlds. I listened to
            audiobooks — the story kind — and kept thinking:{" "}
            <em>what if I could actually participate?</em> What if the story
            responded to me? What if there were spatial sound effects, an
            immersive atmosphere, and I could be fully inside it?
          </BlogP>
          <BlogP>
            Not a video game. Not a podcast. Something else entirely — a live
            conversation with an AI narrator that was watching me, listening
            to every word, and threading my choices into the plot in real time.
          </BlogP>
          <BlogP>
            That feeling — lying in the dark, a story playing out behind your
            closed eyes — is the whole product. Everything else is
            infrastructure.
          </BlogP>
        </BlogSection>

        {/* Section 2 — The Idea */}
        <BlogSection label="02" title="The Idea: Remove the Screen">
          <BlogP>
            The insight was simple, almost obvious in hindsight: every
            &quot;AI game&quot; I&apos;d seen was still a screen experience. A
            chat interface. Buttons. A canvas. They were AI-powered, sure, but
            they still required you to <em>look</em>.
          </BlogP>
          <BlogP>
            What if we removed the screen entirely? What if the game was just:
            close your eyes, put on headphones, speak?
          </BlogP>
          <BlogP>
            Gemini 2.5 Flash&apos;s native audio capabilities made this
            possible in a way that wasn&apos;t feasible before. Native audio
            means the model processes voice input and generates voice output as
            first-class modalities — not text shuttled through a TTS pipeline,
            but genuine real-time audio conversation. The latency drops enough
            that the illusion holds. You feel like you&apos;re{" "}
            <em>talking to someone</em>, not querying a service.
          </BlogP>
          <BlogP>That&apos;s the game. That&apos;s InnerPlay.</BlogP>
        </BlogSection>

        {/* Section 3 — Architecture */}
        <BlogSection label="03" title="How It Actually Works">
          <BlogP>
            The architecture has two phases. I&apos;ll walk through both
            because they&apos;re genuinely interesting and I learned things
            I haven&apos;t seen documented elsewhere.
          </BlogP>

          <ArchDiagram />

          <h3
            style={{
              fontSize: "1rem",
              letterSpacing: "0.18em",
              color: "#E8943C",
              marginTop: "2.5rem",
              marginBottom: "0.75rem",
              textTransform: "uppercase" as const,
              fontFamily: "Georgia, serif",
              fontWeight: 600,
            }}
          >
            Phase 1 — Token Exchange
          </h3>
          <BlogP>
            The browser can&apos;t talk to the Gemini API directly — API keys
            can&apos;t live in client-side code. So we run a lightweight token
            exchange on Google Cloud Run: the browser sends a session request,
            the server validates it and calls the Gemini API to create an
            ephemeral token with a short TTL. That token comes back to the
            browser, which uses it to open a direct WebSocket connection to
            Gemini. Cloud Run never touches audio — it&apos;s just a secure
            gatekeeper.
          </BlogP>

          <h3
            style={{
              fontSize: "1rem",
              letterSpacing: "0.18em",
              color: "#E8943C",
              marginTop: "2.5rem",
              marginBottom: "0.75rem",
              textTransform: "uppercase" as const,
              fontFamily: "Georgia, serif",
              fontWeight: 600,
            }}
          >
            Phase 2 — The Live Session
          </h3>
          <BlogP>
            Once the WebSocket is open, the player&apos;s microphone streams
            directly to Gemini 2.5 Flash. The model acts as both narrator and
            game master. Alongside its narrative role, we inject a{" "}
            <em>State Director</em> — a system-level instruction set that
            tracks story phase, emotional tension, and narrative beats, and
            signals when to trigger sound layers.
          </BlogP>
          <BlogP>
            Audio runs in three layers simultaneously: the Gemini voice
            output, ambient atmospherics (spatial pads, environmental
            textures), and reactive sound effects triggered by story events.
            All of it through the Web Audio API, routed for binaural depth
            when headphones are detected.
          </BlogP>
        </BlogSection>

        {/* Section 4 — Tech Stack */}
        <BlogSection label="04" title="The Stack">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginTop: "1rem",
              marginBottom: "2rem",
            }}
          >
            {[
              { name: "Next.js 16", role: "App framework + API routes" },
              {
                name: "Gemini 2.5 Flash",
                role: "Native audio, narrative + game logic",
              },
              {
                name: "@google/genai SDK",
                role: "WebSocket session management",
              },
              { name: "Google Cloud Run", role: "Ephemeral token server" },
              {
                name: "Web Audio API",
                role: "3-layer spatial audio mixing",
              },
              { name: "TypeScript", role: "End-to-end type safety" },
            ].map((item) => (
              <div
                key={item.name}
                style={{
                  padding: "1rem 1.25rem",
                  border: "1px solid #1a1a1a",
                  backgroundColor: "#070707",
                }}
              >
                <p
                  style={{
                    fontSize: "0.85rem",
                    letterSpacing: "0.12em",
                    color: "#E8943C",
                    marginBottom: "0.3rem",
                    fontFamily: "Georgia, serif",
                    fontWeight: 600,
                    textTransform: "uppercase" as const,
                  }}
                >
                  {item.name}
                </p>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "#666",
                    lineHeight: 1.4,
                    fontFamily: "Georgia, serif",
                  }}
                >
                  {item.role}
                </p>
              </div>
            ))}
          </div>
        </BlogSection>

        {/* Section 5 — Challenges */}
        <BlogSection label="05" title="The Hard Parts">
          <BlogP>
            I&apos;ll be honest: there were moments this week where I thought
            it wasn&apos;t going to work. Here&apos;s what actually bit us.
          </BlogP>

          <ChallengeBlock
            title="Opening-Turn Lockup"
            body="The very first turn of every session had a maddening bug: Gemini would start speaking, then freeze mid-sentence. After hours of debugging we traced it to an audio buffer underflow on the first chunk — the Web Audio API's scheduler needs a warm-up period we weren't giving it. The fix was to pre-schedule a silent buffer before the first real audio arrives."
          />

          <ChallengeBlock
            title="Transient WebSocket Closes"
            body="Native audio WebSocket connections are more fragile than HTTPS. We'd get mid-session disconnects that weren't real network failures — just Gemini's keep-alive window expiring. We built a reconnection layer that detects the close code, re-exchanges tokens, and resumes without the player hearing a gap. Getting that recovery path right took longer than the original connection code."
          />

          <ChallengeBlock
            title="Tool Syntax Bleeding Into Transcripts"
            body="The State Director communicates via structured tool calls embedded in the model's output. Early on, JSON fragments would occasionally leak into the spoken narrative — the model would literally say 'open bracket trigger underscore sound close bracket' out loud. We fixed this by adding an explicit sanitization step that strips tool syntax from any text marked for audio rendering."
          />

          <ChallengeBlock
            title="Narrative Structure vs. Freeform AI"
            body="This is the design tension that doesn't have a clean fix. A structured story needs acts, escalation, a climax. A freeform AI wants to be helpful and go wherever the user leads. We ended up giving the State Director authority over story phase — the model can improvise freely within a phase, but the Director controls when we move to the next one. It's collaborative constraint, not hard-coded branching."
          />
        </BlogSection>

        {/* Section 6 — What We Learned */}
        <BlogSection label="06" title="What We Learned">
          <BlogP>
            Voice-first design is a completely different discipline. When
            there&apos;s no screen, you lose every affordance that visual UI
            provides: progress indicators, menus, tooltips, confirmations. The
            experience has to be legible through audio alone. That forces
            extreme clarity in the writing and extreme trust in the player.
          </BlogP>
          <BlogP>
            Short-form is the right format. Ten minutes, not sixty. The
            concentration required for eyes-closed immersive audio is real.
            Ten minutes is a session you can fit into the gap before sleep.
            It&apos;s long enough to have a complete dramatic arc. It&apos;s
            the right unit of experience.
          </BlogP>
          <BlogP>
            The brain is the best rendering engine. We have no graphics, no
            animations, no particle effects. But when the audio is right and
            the voice is right and the story is right, players report seeing
            things vividly. Describing a flooded basement works harder than
            showing one. I didn&apos;t expect that to still surprise me — but
            it did, every playtest.
          </BlogP>
          <BlogP>
            And the biggest one: Gemini 2.5 Flash is genuinely, meaningfully
            different from text models at this task. The voice has emotional
            range. It modulates under tension. It pauses. Those qualities
            aren&apos;t cosmetic — they&apos;re load-bearing for the horror
            atmosphere. Without them, this game doesn&apos;t work.
          </BlogP>
        </BlogSection>

        {/* Section 7 — Demo Video placeholder */}
        <BlogSection label="07" title="Demo Video">
          <BlogP>Watch a full session of InnerPlay — no screen, just voice.</BlogP>
          <div
            id="demo-video"
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              backgroundColor: "#070707",
              border: "1px solid #1a1a1a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "1.5rem",
            }}
          >
            <p
              style={{
                fontSize: "0.9rem",
                color: "#2a2a2a",
                fontStyle: "italic",
                fontFamily: "Georgia, serif",
              }}
            >
              {/* YouTube embed will go here */}
              Video embed coming soon
            </p>
          </div>
        </BlogSection>

        {/* Section 8 — Podcast placeholder */}
        <BlogSection label="08" title="Hear the Story">
          <BlogP>
            A deep-dive audio overview of the InnerPlay architecture and
            vision — generated with NotebookLM.
          </BlogP>
          <div
            id="podcast-player"
            style={{
              width: "100%",
              backgroundColor: "#070707",
              border: "1px solid #1a1a1a",
              padding: "2rem",
              marginTop: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "80px",
            }}
          >
            <p
              style={{
                fontSize: "0.9rem",
                color: "#2a2a2a",
                fontStyle: "italic",
                fontFamily: "Georgia, serif",
              }}
            >
              {/* NotebookLM audio player will go here */}
              Audio overview coming soon
            </p>
          </div>
        </BlogSection>

        {/* Footer note */}
        <div
          style={{
            marginTop: "5rem",
            paddingTop: "2rem",
            borderTop: "1px solid #1a1a1a",
            display: "flex",
            flexDirection: "column" as const,
            gap: "0.75rem",
          }}
        >
          <p
            style={{
              fontSize: "0.88rem",
              color: "#555",
              fontStyle: "italic",
              fontFamily: "Georgia, serif",
            }}
          >
            This article was created for the Gemini Live Agent Challenge 2026.{" "}
            <span style={{ color: "#E8943C" }}>#GeminiLiveAgentChallenge</span>
          </p>
          <p style={{ fontSize: "0.88rem", fontFamily: "Georgia, serif" }}>
            <a
              href="/"
              style={{
                color: "#E8943C",
                textDecoration: "none",
                borderBottom: "1px solid rgba(232,148,60,0.3)",
              }}
            >
              Play InnerPlay →
            </a>
          </p>
        </div>
      </article>
    </main>
  );
}

/* ─── Sub-components ──────────────────────────────────────── */

function BlogSection({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: "4rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            letterSpacing: "0.25em",
            color: "rgba(232,148,60,0.6)",
            flexShrink: 0,
            fontFamily: "Georgia, serif",
          }}
        >
          {label}
        </span>
        <h2
          style={{
            fontSize: "clamp(1.4rem, 3.5vw, 2rem)",
            fontWeight: 700,
            letterSpacing: "0.01em",
            color: "#fff",
            lineHeight: 1.1,
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function BlogP({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "clamp(1rem, 2vw, 1.15rem)",
        fontWeight: 300,
        lineHeight: 1.85,
        color: "#bbb",
        marginBottom: "1.4rem",
        maxWidth: "68ch",
        fontFamily: "Georgia, serif",
      }}
    >
      {children}
    </p>
  );
}

function ChallengeBlock({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        marginBottom: "2rem",
        paddingLeft: "1.25rem",
        borderLeft: "2px solid #1e1e1e",
      }}
    >
      <h3
        style={{
          fontSize: "0.88rem",
          letterSpacing: "0.15em",
          color: "#E8943C",
          marginBottom: "0.5rem",
          textTransform: "uppercase" as const,
          fontFamily: "Georgia, serif",
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "clamp(1rem, 2vw, 1.1rem)",
          fontWeight: 300,
          lineHeight: 1.8,
          color: "#999",
          maxWidth: "68ch",
          fontFamily: "Georgia, serif",
        }}
      >
        {body}
      </p>
    </div>
  );
}

function ArchDiagram() {
  return (
    <div
      style={{
        margin: "2rem 0",
        backgroundColor: "#050505",
        border: "1px solid #1a1a1a",
        padding: "2rem 1.5rem",
        overflowX: "auto",
      }}
    >
      <pre
        style={{
          margin: 0,
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: "clamp(0.6rem, 1.4vw, 0.78rem)",
          color: "#555",
          lineHeight: 1.9,
          whiteSpace: "pre",
        }}
      >
        {`                PHASE 1 — TOKEN EXCHANGE
  ┌──────────────┐      HTTPS       ┌─────────────────┐
  │   Browser    │ ───────────────▶ │  Cloud Run      │
  │              │                  │  Token Server   │
  │              │ ◀─────────────── │                 │
  │  (ephemeral  │   short-TTL      └────────┬────────┘
  │   token)     │   token                   │
  └──────┬───────┘                    Gemini API
         │                           (token issuance)
         │
         │           PHASE 2 — LIVE SESSION
         │   WebSocket (native audio, bi-directional)
         ▼
  ┌─────────────────────────────────────────────────┐
  │             Gemini 2.5 Flash                    │
  │        Narrator + Game Master + State Director  │
  └──────────────────────┬──────────────────────────┘
                         │ audio + tool events
                         ▼
           ┌─────────────────────────┐
           │      Web Audio API      │
           │  Layer 1: Gemini voice  │
           │  Layer 2: Atmospherics  │
           │  Layer 3: SFX triggers  │
           └────────────┬────────────┘
                        │
                        ▼
                   [ Headphones ]`}
      </pre>
    </div>
  );
}
