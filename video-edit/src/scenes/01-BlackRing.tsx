/**
 * Scene 01 — Black Ring
 * 5 seconds (150 frames @ 30fps)
 * Black screen, single breathing dot pulse, phone ring sound fades in
 */
import React from "react";
import {
  AbsoluteFill,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  staticFile,
} from "remotion";
import { COLORS } from "../tokens";

export const BlackRing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Breathing: one full pulse cycle every 2 seconds
  const cycleFrames = fps * 2;
  const cyclePos = (frame % cycleFrames) / cycleFrames; // 0..1

  // Scale: 1.0 → 1.4 → 1.0 using sin
  const scale = 1 + 0.4 * Math.sin(cyclePos * Math.PI);

  // Opacity fades in over first 0.5s
  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ backgroundColor: COLORS.black, justifyContent: "center", alignItems: "center" }}
    >
      {/* Phone ring audio — fade in over 2s */}
      {/* Uncomment when audio file is available: */}
      {/* <Audio src={staticFile("audio/phone-ring.mp3")} volume={(f) => interpolate(f, [0, fps * 2], [0, 0.8], { extrapolateRight: "clamp" })} /> */}

      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          backgroundColor: COLORS.white,
          opacity,
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};
