export default function Home() {
  return (
    <main
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
      <h1
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "var(--font-size-3xl)",
          fontWeight: 400,
          letterSpacing: "0.05em",
          marginBottom: "var(--space-4)",
        }}
      >
        The Last Session
      </h1>
      <p
        style={{
          color: "var(--color-text-secondary)",
          fontSize: "var(--font-size-lg)",
          maxWidth: "28ch",
          marginBottom: "var(--space-12)",
        }}
      >
        Close your eyes. Listen. The session has begun.
      </p>
      <a
        href="/play"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "var(--touch-min)",
          padding: "var(--space-3) var(--space-8)",
          border: "1px solid var(--color-accent-dim)",
          borderRadius: "var(--radius-full)",
          color: "var(--color-accent)",
          fontSize: "var(--font-size-lg)",
          fontFamily: "var(--font-body)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          transition: "var(--transition-normal)",
        }}
      >
        Begin
      </a>
    </main>
  );
}
