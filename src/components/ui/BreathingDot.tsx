"use client";

interface BreathingDotProps {
  size?: number;
  phase?: number;
  isSpeaking?: boolean;
}

function getBreathingClass(phase: number): string {
  if (phase >= 4) return "breathe-phase4";
  if (phase >= 3) return "breathe-phase3";
  if (phase >= 2) return "breathe-phase2";
  return "breathe";
}

export function BreathingDot({ size = 10, phase = 0, isSpeaking = false }: BreathingDotProps) {
  return (
    <div
      className={isSpeaking ? "pulse" : getBreathingClass(phase)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: "var(--accent)",
        flexShrink: 0,
      }}
    />
  );
}
