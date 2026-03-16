/**
 * Scene 05 — Powered By
 * 2 seconds (60 frames @ 30fps)
 * "Built with Gemini Live API · Google Cloud Run"
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS, FONTS } from "../tokens";

export const PoweredBy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.black,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 20,
          letterSpacing: "0.4em",
          color: COLORS.muted,
          opacity,
          textTransform: "uppercase",
        }}
      >
        Built with
      </div>
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 52,
          letterSpacing: "0.1em",
          color: COLORS.white,
          opacity,
          textAlign: "center",
        }}
      >
        Gemini Live API{" "}
        <span style={{ color: COLORS.muted }}>·</span>{" "}
        Google Cloud Run
      </div>
    </AbsoluteFill>
  );
};
