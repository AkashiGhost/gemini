import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — InnerPlay",
  description:
    "InnerPlay collects no personal data on our servers. Your player profile lives only in your browser. Read how we handle your data.",
};

// ── Shared legal page layout primitives ─────────────────────────────────────

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

export default function PrivacyPage() {
  return (
    <main id="main-content" style={pageStyle}>
      <div style={innerStyle}>
        {/* Back navigation */}
        <Link href="/" style={backLinkStyle}>
          ← BACK TO INNERPLAY
        </Link>

        {/* Header */}
        <h1 style={h1Style}>PRIVACY POLICY</h1>
        <p style={subtitleStyle}>Last updated: March 2026</p>

        <hr style={dividerStyle} />

        {/* Introduction */}
        <h2 style={h2Style}>THE SHORT VERSION</h2>
        <p style={pStyle}>
          InnerPlay stores nothing about you on any server. Your player profile
          lives only in your own browser. We have no accounts, no cookies, no
          analytics, and no tracking of any kind. The only data that ever leaves
          your device is the audio you speak during a session — which is
          processed by Google&apos;s Gemini API in real time and not retained by
          us.
        </p>

        {/* Data we collect */}
        <h2 style={h2Style}>WHAT WE COLLECT — AND WHERE IT LIVES</h2>
        <p style={pStyle}>
          InnerPlay uses your browser&apos;s <code>localStorage</code> to store
          the following data locally on your device:
        </p>
        <p style={pStyle}>
          <strong style={{ color: "var(--white)", fontStyle: "normal" }}>
            Player profile
          </strong>{" "}
          — an optional emotional self-portrait you create before playing
          (life stage, values, fears, a brief self-description). This data never
          leaves your device. It is used solely to personalise the story you
          hear during the session.
        </p>
        <p style={pStyle}>
          <strong style={{ color: "var(--white)", fontStyle: "normal" }}>
            Session state
          </strong>{" "}
          — temporary playback state (e.g. which story you were playing, where
          you left off). Cleared automatically when your session ends.
        </p>
        <p style={pStyle}>
          We have no database of users. No data from{" "}
          <code>localStorage</code> is transmitted to InnerPlay servers, logged,
          or shared with any third party.
        </p>

        {/* Voice data */}
        <h2 style={h2Style}>YOUR VOICE</h2>
        <p style={pStyle}>
          When you play a story, your microphone audio is streamed in real time
          to Google&apos;s Gemini API (Gemini 2.5 Flash) for natural-language
          processing. This is the only data that leaves your device.
        </p>
        <p style={pStyle}>
          InnerPlay does not record, store, or retain any audio. We have no
          access to recordings after your session ends. For information on how
          Google handles data sent to their API, please read{" "}
          <a
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noopener noreferrer"
            style={externalLinkStyle}
          >
            Google&apos;s Generative AI Terms of Service ↗
          </a>{" "}
          and{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            style={externalLinkStyle}
          >
            Google&apos;s Privacy Policy ↗
          </a>
          .
        </p>

        {/* Cookies & Analytics */}
        <h2 style={h2Style}>COOKIES &amp; ANALYTICS</h2>
        <p style={pStyle}>
          We use no cookies. We run no analytics scripts. We embed no third-party
          tracking pixels or SDKs. There is nothing to accept or decline.
        </p>

        {/* Children */}
        <h2 style={h2Style}>CHILDREN</h2>
        <p style={pStyle}>
          InnerPlay is not designed for or directed at children under 13. The
          stories deal with adult emotional themes. We do not knowingly collect
          any information from children. If you are a parent or guardian and
          believe a child has used the service, there is no data for us to
          delete — but you are welcome to contact us.
        </p>

        {/* GDPR / Rights */}
        <h2 style={h2Style}>YOUR RIGHTS (GDPR / UK GDPR)</h2>
        <p style={pStyle}>
          Because InnerPlay holds no personal data on any server, we are not a
          data controller in the traditional sense. All data we described above
          exists exclusively in your own browser under your own control.
        </p>
        <p style={pStyle}>
          You can delete your player profile at any time by clearing your
          browser&apos;s <code>localStorage</code> for innerplay.app, or by
          using your browser&apos;s built-in &quot;Clear site data&quot; function.
        </p>
        <p style={pStyle}>
          If you have concerns about data processed by Google&apos;s Gemini API,
          please refer to Google&apos;s privacy controls and contact Google
          directly.
        </p>

        {/* Infrastructure */}
        <h2 style={h2Style}>HOSTING &amp; INFRASTRUCTURE</h2>
        <p style={pStyle}>
          InnerPlay is hosted on Google Cloud Run (region: us-central1). Standard
          server access logs (IP address, timestamp, URL path, user-agent) may
          be retained by Google Cloud for up to 30 days as part of normal
          infrastructure operation. These logs are not processed by InnerPlay
          for any purpose and are not linked to any user identity.
        </p>

        {/* Changes */}
        <h2 style={h2Style}>CHANGES TO THIS POLICY</h2>
        <p style={pStyle}>
          If we ever meaningfully change how we handle data, we will update
          this page and revise the date at the top. Because we have no user
          accounts, we cannot notify you directly — so please check back if you
          are concerned.
        </p>

        {/* Contact */}
        <h2 style={h2Style}>CONTACT</h2>
        <p style={pStyle}>
          Questions about this policy?{" "}
          <a href="mailto:hello@innerplay.app" style={externalLinkStyle}>
            hello@innerplay.app
          </a>
        </p>

        {/* Footer navigation */}
        <nav style={footerStyle} aria-label="Legal pages">
          <Link href="/terms" style={footerLinkStyle}>
            TERMS OF SERVICE
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
