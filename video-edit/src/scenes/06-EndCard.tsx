/**
 * Scene 06 — End Card
 * 5 seconds (150 frames @ 30fps)
 * Breathing dot + "innerplay.app" + "Close your eyes. Speak. Play."
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { COLORS, FONTS } from "../tokens";

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Breathing dot — same as scene 01
  const cycleFrames = fps * 2;
  const cyclePos = (frame % cycleFrames) / cycleFrames;
  const dotScale = 1 + 0.4 * Math.sin(cyclePos * Math.PI);

  // Staggered fade-ins
  const dotOpacity = interpolate(frame, [0, fps * 0.4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const urlOpacity = interpolate(frame, [fps * 0.5, fps * 1.0], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const taglineOpacity = interpolate(frame, [fps * 1.2, fps * 1.8], [0, 1], {
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
        gap: 48,
      }}
    >
      {/* Breathing dot */}
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: COLORS.amber,
          opacity: dotOpacity,
          transform: `scale(${dotScale})`,
        }}
      />

      {/* URL */}
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 72,
          letterSpacing: "0.06em",
          color: COLORS.white,
          opacity: urlOpacity,
        }}
      >
        innerplay.app
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily: FONTS.literary,
          fontStyle: "italic",
          fontSize: 36,
          color: COLORS.muted,
          opacity: taglineOpacity,
          letterSpacing: "0.04em",
        }}
      >
        Close your eyes. Speak. Play.
      </div>
    </AbsoluteFill>
  );
};
