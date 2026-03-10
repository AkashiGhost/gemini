import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — InnerPlay",
  description:
    "InnerPlay is a free, experimental voice storytelling experience. Read the terms before playing.",
};

// ── Shared layout primitives ─────────────────────────────────────────────────

const pageStyle: React.CSSProperties = {
  background: "var(--black)",
  color: "var(--white)",
  minHeight: "100dvh",
  padding: "var(--space-xl) var(--space-md)",
};

const innerStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
};

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontFamily: "var(--font-ui)",
  fontSize: "var(--type-ui)",
  color: "var(--muted)",
  textDecoration: "none",
  letterSpacing: "1px",
  marginBottom: "var(--space-xl)",
  minHeight: "var(--touch-min)",
};

const h1Style: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "var(--type-lead)",
  color: "var(--white)",
  letterSpacing: "4px",
  lineHeight: 1,
  margin: 0,
  marginBottom: "var(--space-xs)",
};

const subtitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-literary)",
  fontSize: "var(--type-body)",
  color: "var(--muted)",
  fontStyle: "italic",
  margin: 0,
  marginBottom: "var(--space-xl)",
};

const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "var(--type-section)",
  color: "var(--accent)",
  letterSpacing: "2px",
  lineHeight: 1,
  margin: 0,
  marginTop: "var(--space-lg)",
  marginBottom: "var(--space-sm)",
};

const pStyle: React.CSSProperties = {
  fontFamily: "var(--font-literary)",
  fontSize: "var(--type-body)",
  color: "var(--muted)",
  lineHeight: 1.8,
  margin: 0,
  marginBottom: "var(--space-sm)",
};

const dividerStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  margin: "var(--space-xl) 0 0",
};

const footerStyle: React.CSSProperties = {
  marginTop: "var(--space-xl)",
  paddingTop: "var(--space-md)",
  borderTop: "1px solid rgba(255,255,255,0.06)",
  display: "flex",
  gap: "var(--space-md)",
  flexWrap: "wrap" as const,
};

const footerLinkStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--type-ui)",
  color: "var(--muted)",
  letterSpacing: "1px",
  textDecoration: "none",
};

const externalLinkStyle: React.CSSProperties = {
  color: "var(--accent)",
  textDecoration: "none",
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function TermsPage() {
  return (
    <main id="main-content" style={pageStyle}>
      <div style={innerStyle}>
        {/* Back navigation */}
        <Link href="/" style={backLinkStyle}>
          ← BACK TO INNERPLAY
        </Link>

        {/* Header */}
        <h1 style={h1Style}>TERMS OF SERVICE</h1>
        <p style={subtitleStyle}>Last updated: March 2026</p>

        <hr style={dividerStyle} />

        {/* Acceptance */}
        <h2 style={h2Style}>ACCEPTANCE OF TERMS</h2>
        <p style={pStyle}>
          By accessing or using InnerPlay at innerplay.app, you agree to these
          terms. If you do not agree, please do not use the service.
        </p>

        {/* What InnerPlay is */}
        <h2 style={h2Style}>WHAT INNERPLAY IS</h2>
        <p style={pStyle}>
          InnerPlay is a voice-only interactive storytelling experience. Players
          speak to an AI character powered by Google&apos;s Gemini Live API.
          Stories unfold in real time based on what you say.
        </p>
        <p style={pStyle}>
          InnerPlay was built as a hackathon project for the Gemini Live Agent
          Challenge 2026. It is offered free of charge, without warranties of
          any kind, as an experimental creative work.
        </p>

        {/* Free to use / No warranties */}
        <h2 style={h2Style}>FREE TO USE — NO WARRANTIES</h2>
        <p style={pStyle}>
          InnerPlay is provided &quot;as is&quot; and &quot;as available&quot;
          without any warranty, express or implied, including but not limited to
          warranties of merchantability, fitness for a particular purpose, or
          non-infringement. We do not warrant that the service will be
          uninterrupted, error-free, or continuously available.
        </p>
        <p style={pStyle}>
          As a hackathon prototype, InnerPlay may be modified, paused, or shut
          down at any time without notice.
        </p>

        {/* AI-generated content */}
        <h2 style={h2Style}>AI-GENERATED CONTENT</h2>
        <p style={pStyle}>
          All story dialogue, character responses, and narrative content are
          generated in real time by Google&apos;s Gemini 2.5 Flash model. This
          content is not pre-scripted and may vary between sessions.
        </p>
        <p style={pStyle}>
          AI-generated content may occasionally be inaccurate, unexpected, or
          inconsistent. InnerPlay is not responsible for the specific content
          generated in any given session. If a response feels wrong or
          inappropriate, you can end the session at any time.
        </p>
        <p style={pStyle}>
          Mature emotional themes are an intentional part of the InnerPlay
          experience. These stories explore fear, loss, loneliness, and moral
          complexity. They are not suitable for children under 13.
        </p>

        {/* User conduct */}
        <h2 style={h2Style}>YOUR VOICE INPUT</h2>
        <p style={pStyle}>
          Your voice is streamed to Google&apos;s Gemini API during play. By
          using InnerPlay you acknowledge this and agree to{" "}
          <a
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={externalLinkStyle}
          >
            Google&apos;s Generative AI Terms of Service ↗
          </a>
          .
        </p>
        <p style={pStyle}>
          You agree not to use InnerPlay to generate, elicit, or transmit
          content that is illegal, harassing, or harmful to others. InnerPlay
          is built for single-player personal use — not for recording,
          broadcasting, or scraping AI responses at scale.
        </p>

        {/* Intellectual property */}
        <h2 style={h2Style}>INTELLECTUAL PROPERTY</h2>
        <p style={pStyle}>
          The InnerPlay brand, name, visual design, written story prompts, and
          system architecture are the intellectual property of Akash Manmohan.
          All rights reserved.
        </p>
        <p style={pStyle}>
          AI-generated responses produced during your session are transient and
          are not recorded, owned, or licensed by InnerPlay. The spoken words
          you contribute to a session remain yours.
        </p>

        {/* Limitation of liability */}
        <h2 style={h2Style}>LIMITATION OF LIABILITY</h2>
        <p style={pStyle}>
          To the fullest extent permitted by applicable law, InnerPlay and its
          creator shall not be liable for any direct, indirect, incidental,
          special, consequential, or punitive damages arising from your use of,
          or inability to use, the service — including but not limited to
          emotional distress caused by story content, data loss, or service
          interruptions.
        </p>
        <p style={pStyle}>
          Your sole remedy for dissatisfaction with the service is to stop
          using it.
        </p>

        {/* Governing law */}
        <h2 style={h2Style}>GOVERNING LAW</h2>
        <p style={pStyle}>
          These terms are governed by the laws of England and Wales. Any
          disputes shall be subject to the exclusive jurisdiction of the courts
          of England and Wales.
        </p>

        {/* Changes */}
        <h2 style={h2Style}>CHANGES TO THESE TERMS</h2>
        <p style={pStyle}>
          We may update these terms at any time. Continued use of the service
          after changes are posted constitutes acceptance of the revised terms.
          The date at the top of this page always reflects the most recent
          revision.
        </p>

        {/* Contact */}
        <h2 style={h2Style}>CONTACT</h2>
        <p style={pStyle}>
          Questions?{" "}
          <a href="mailto:hello@innerplay.app" style={externalLinkStyle}>
            hello@innerplay.app
          </a>
        </p>

        {/* Footer navigation */}
        <nav style={footerStyle} aria-label="Legal pages">
          <Link href="/privacy" style={footerLinkStyle}>
            PRIVACY POLICY
          </Link>
          <Link href="/cookies" style={footerLinkStyle}>
            COOKIE POLICY
          </Link>
          <Link href="/" style={footerLinkStyle}>
            BACK HOME
          </Link>
        </nav>
      </div>
    </main>
  );
}
