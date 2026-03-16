/**
 * Scene 02 — Alex's Opening Line
 * 4 seconds (120 frames @ 30fps)
 * "Hello? Oh — you answered." fades in letter by letter
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS, FONTS } from "../tokens";

const TEXT = "Hello? Oh — you answered.";
// Each letter appears sequentially; total spread = 3s, last 1s holds
const SPREAD_FRAMES = 90; // 3s

export const AlexText: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade-in of the whole block after a short delay
  const blockOpacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.black,
        justifyContent: "center",
        alignItems: "center",
        padding: "0 120px",
      }}
    >
      {/* Attribution label */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 120,
          fontFamily: FONTS.display,
          fontSize: 18,
          letterSpacing: "0.3em",
          color: COLORS.amber,
          opacity: blockOpacity,
          textTransform: "uppercase",
        }}
      >
        Alex
      </div>

      <div
        style={{
          fontFamily: FONTS.literary,
          fontStyle: "italic",
          fontSize: 72,
          color: COLORS.white,
          textAlign: "center",
          lineHeight: 1.3,
          opacity: blockOpacity,
        }}
      >
        {TEXT.split("").map((char, i) => {
          // Each character reveals sequentially across SPREAD_FRAMES
          const charFrame = (i / TEXT.length) * SPREAD_FRAMES;
          const charOpacity = interpolate(frame, [charFrame, charFrame + 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <span key={i} style={{ opacity: charOpacity }}>
              {char}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
