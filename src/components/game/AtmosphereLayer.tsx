"use client";

// ─────────────────────────────────────────────
// AtmosphereLayer — CSS-only ambient fog effect
// Renders behind the gameplay screen for stories
// that have atmosphere: true in meta.yaml (Room 4B).
// Two overlapping radial gradients drift slowly
// to simulate dark fog. Phase progression deepens
// the darkness and slows the drift.
// ─────────────────────────────────────────────

interface AtmosphereLayerProps {
  phase: number;
}

export function AtmosphereLayer({ phase }: AtmosphereLayerProps) {
  // Phase progression: fog gets darker and slower
  const fogOpacity = Math.min(0.15 + phase * 0.04, 0.35);
  const driftDuration = Math.max(30 - phase * 3, 15); // seconds, slower in later phases

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Fog layer 1 — drifts left-to-right */}
      <div
        style={{
          position: "absolute",
          inset: "-50%",
          background:
            "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(28, 28, 34, 0.8) 0%, transparent 70%)",
          opacity: fogOpacity,
          animation: `atmosphereDrift1 ${driftDuration}s ease-in-out infinite alternate`,
        }}
      />
      {/* Fog layer 2 — drifts right-to-left, offset timing */}
      <div
        style={{
          position: "absolute",
          inset: "-50%",
          background:
            "radial-gradient(ellipse 70% 50% at 70% 60%, rgba(20, 20, 24, 0.6) 0%, transparent 65%)",
          opacity: fogOpacity * 0.7,
          animation: `atmosphereDrift2 ${driftDuration * 1.3}s ease-in-out infinite alternate`,
        }}
      />
      {/* Vignette — darkens edges, intensifies per phase */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, transparent 30%, rgba(0, 0, 0, 0.6) 100%)",
          opacity: Math.min(0.3 + phase * 0.1, 0.8),
        }}
      />
    </div>
  );
}
