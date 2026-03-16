/**
 * Scene 04 — Subtitle
 * 3 seconds (90 frames @ 30fps)
 * "The first game designed to be played with your eyes closed"
 * Cormorant Garamond italic, fade in
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS, FONTS } from "../tokens";

export const Subtitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 0.8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.black,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 160px",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.literary,
          fontStyle: "italic",
          fontSize: 56,
          color: COLORS.white,
          textAlign: "center",
          lineHeight: 1.5,
          opacity,
          maxWidth: 1100,
        }}
      >
        The first game designed to be played with your eyes closed
      </div>
    </AbsoluteFill>
  );
};
