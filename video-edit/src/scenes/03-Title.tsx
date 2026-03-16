/**
 * Scene 03 — Title Card
 * 3 seconds (90 frames @ 30fps)
 * "InnerPlay" in Bebas Neue, white on black, fade in
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS, FONTS } from "../tokens";

export const TitleCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 0.6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle upward drift on entry
  const translateY = interpolate(frame, [0, fps * 0.6], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.black,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 180,
          letterSpacing: "0.08em",
          color: COLORS.white,
          opacity,
          transform: `translateY(${translateY}px)`,
          lineHeight: 1,
        }}
      >
        InnerPlay
      </div>
    </AbsoluteFill>
  );
};
