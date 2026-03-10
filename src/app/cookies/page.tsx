import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy — InnerPlay",
  description:
    "InnerPlay uses no cookies. We use browser localStorage only, to store your player profile locally on your device.",
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

const highlightBoxStyle: React.CSSProperties = {
  border: "1px solid var(--accent)",
  padding: "var(--space-md)",
  marginTop: "var(--space-md)",
  marginBottom: "var(--space-md)",
};

const highlightTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-literary)",
  fontSize: "var(--type-title)",
  color: "var(--white)",
  fontStyle: "italic",
  margin: 0,
  lineHeight: 1.5,
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto" as const,
  marginBottom: "var(--space-md)",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse" as const,
  fontFamily: "var(--font-literary)",
  fontSize: "var(--type-body)",
  color: "var(--muted)",
};

const thStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize: "var(--type-ui)",
  color: "var(--white)",
  letterSpacing: "1px",
  textAlign: "left" as const,
  padding: "var(--space-xs) var(--space-sm)",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  whiteSpace: "nowrap" as const,
};

const tdStyle: React.CSSProperties = {
  padding: "var(--space-xs) var(--space-sm)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  verticalAlign: "top" as const,
  lineHeight: 1.6,
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

export default function CookiesPage() {
  return (
    <main id="main-content" style={pageStyle}>
      <div style={innerStyle}>
        {/* Back navigation */}
        <Link href="/" style={backLinkStyle}>
          ← BACK TO INNERPLAY
        </Link>

        {/* Header */}
        <h1 style={h1Style}>COOKIE POLICY</h1>
        <p style={subtitleStyle}>Last updated: March 2026</p>

        <hr style={dividerStyle} />

        {/* The bold statement */}
        <div style={highlightBoxStyle}>
          <p style={highlightTextStyle}>
            InnerPlay uses zero cookies. There is no cookie banner because there
            is nothing to consent to.
          </p>
        </div>

        {/* No cookies */}
        <h2 style={h2Style}>NO COOKIES</h2>
        <p style={pStyle}>
          We do not set any cookies — first-party or third-party, session or
          persistent, strictly necessary or optional. We do not use cookies for
          analytics, advertising, authentication, or any other purpose.
        </p>
        <p style={pStyle}>
          If you see a cookie associated with innerplay.app in your browser,
          it was not set intentionally by us. Please{" "}
          <a href="mailto:hello@innerplay.app" style={externalLinkStyle}>
            let us know
          </a>
          .
        </p>

        {/* localStorage */}
        <h2 style={h2Style}>WHAT WE DO USE: LOCALSTORAGE</h2>
        <p style={pStyle}>
          InnerPlay uses your browser&apos;s <code>localStorage</code> — a
          client-side storage mechanism that is entirely different from cookies.
          Data in <code>localStorage</code> is never sent to any server
          automatically; it stays on your device until you clear it.
        </p>
        <p style={pStyle}>
          We store the following items:
        </p>

        {/* localStorage table */}
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Key</th>
                <th style={thStyle}>Contents</th>
                <th style={thStyle}>Purpose</th>
                <th style={thStyle}>Expires</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tdStyle}>
                  <code>innerplay_profile</code>
                </td>
                <td style={tdStyle}>
                  Life stage, values, fears, self-description — what you enter
                  in the player profile flow
                </td>
                <td style={tdStyle}>
                  Personalises the AI character&apos;s responses during play
                </td>
                <td style={tdStyle}>Persists until you clear it manually</td>
              </tr>
              <tr>
                <td style={tdStyle}>
                  <code>innerplay_session</code>
                </td>
                <td style={tdStyle}>
                  Current story ID, onboarding state
                </td>
                <td style={tdStyle}>
                  Restores your place if you navigate away mid-session
                </td>
                <td style={tdStyle}>Cleared when session ends</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Clearing data */}
        <h2 style={h2Style}>HOW TO CLEAR YOUR DATA</h2>
        <p style={pStyle}>
          You can delete all InnerPlay data at any time without contacting us.
          In most browsers, go to{" "}
          <strong style={{ color: "var(--white)", fontStyle: "normal" }}>
            Settings → Privacy &amp; Security → Site data → innerplay.app →
            Clear
          </strong>
          . You can also open your browser&apos;s developer console and run:
        </p>
        <p
          style={{
            ...pStyle,
            fontFamily: "monospace",
            background: "rgba(255,255,255,0.04)",
            padding: "var(--space-sm)",
            borderLeft: "2px solid var(--accent)",
          }}
        >
          localStorage.removeItem(&apos;innerplay_profile&apos;);
          localStorage.removeItem(&apos;innerplay_session&apos;);
        </p>

        {/* No third parties */}
        <h2 style={h2Style}>NO THIRD-PARTY SCRIPTS</h2>
        <p style={pStyle}>
          InnerPlay loads no analytics SDKs, no advertising scripts, no social
          media widgets, and no third-party fonts that could track you. The only
          external connection made during a session is to Google&apos;s Gemini
          API for real-time voice processing. See our{" "}
          <Link href="/privacy" style={externalLinkStyle}>
            Privacy Policy
          </Link>{" "}
          for full details.
        </p>

        {/* Contact */}
        <h2 style={h2Style}>QUESTIONS</h2>
        <p style={pStyle}>
          <a href="mailto:hello@innerplay.app" style={externalLinkStyle}>
            hello@innerplay.app
          </a>
        </p>

        {/* Footer navigation */}
        <nav style={footerStyle} aria-label="Legal pages">
          <Link href="/privacy" style={footerLinkStyle}>
            PRIVACY POLICY
          </Link>
          <Link href="/terms" style={footerLinkStyle}>
            TERMS OF SERVICE
          </Link>
          <Link href="/" style={footerLinkStyle}>
            BACK HOME
          </Link>
        </nav>
      </div>
    </main>
  );
}
