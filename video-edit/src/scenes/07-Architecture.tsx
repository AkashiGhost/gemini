/**
 * Scene 07 — Architecture Diagram
 * 8 seconds (240 frames @ 30fps)
 * Animated flow: Player Mic → WebSocket → Gemini 2.5 Flash → Cloud Run
 *                → Tool Calls → 3-Layer Audio → Headphones
 */
import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONTS } from "../tokens";

interface NodeProps {
  label: string;
  sublabel?: string;
  x: number;
  y: number;
  opacity: number;
  accent?: boolean;
}

const ArchNode: React.FC<NodeProps> = ({ label, sublabel, x, y, opacity, accent }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: "translate(-50%, -50%)",
      opacity,
      textAlign: "center",
      minWidth: 180,
    }}
  >
    <div
      style={{
        border: `2px solid ${accent ? COLORS.amber : COLORS.mutedDark}`,
        borderRadius: 12,
        padding: "14px 20px",
        backgroundColor: accent ? "rgba(232,148,60,0.08)" : "rgba(255,255,255,0.04)",
      }}
    >
      <div
        style={{
          fontFamily: FONTS.display,
          fontSize: 22,
          letterSpacing: "0.06em",
          color: accent ? COLORS.amber : COLORS.white,
        }}
      >
        {label}
      </div>
      {sublabel && (
        <div
          style={{
            fontFamily: FONTS.literary,
            fontSize: 14,
            color: COLORS.muted,
            marginTop: 4,
          }}
        >
          {sublabel}
        </div>
      )}
    </div>
  </div>
);

interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  opacity: number;
  label?: string;
}

const Arrow: React.FC<ArrowProps> = ({ x1, y1, x2, y2, opacity, label }) => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <>
      <svg
        style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", opacity, pointerEvents: "none" }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill={COLORS.muted} />
          </marker>
        </defs>
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={COLORS.mutedDark}
          strokeWidth={2}
          markerEnd="url(#arrowhead)"
        />
      </svg>
      {label && (
        <div
          style={{
            position: "absolute",
            left: midX,
            top: midY - 18,
            transform: "translateX(-50%)",
            fontFamily: FONTS.literary,
            fontSize: 13,
            color: COLORS.muted,
            opacity,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </div>
      )}
    </>
  );
};

// Layout: horizontal row at y=540, nodes spread across 1720px (margins 100px each side)
const CX = 960; // center x
const CY = 480; // center y
const GAP = 220;

const nodes = [
  { label: "Player Mic",   sublabel: "Browser MediaStream",   x: CX - GAP * 3, y: CY },
  { label: "WebSocket",    sublabel: "Bidirectional stream",   x: CX - GAP * 2, y: CY },
  { label: "Gemini 2.5",  sublabel: "Flash Native Audio",     x: CX - GAP * 1, y: CY, accent: true },
  { label: "Cloud Run",   sublabel: "Google / Node 20",       x: CX,           y: CY },
  { label: "Tool Calls",  sublabel: "State Director",         x: CX + GAP * 1, y: CY },
  { label: "3-Layer Audio",sublabel: "Story · Ambience · SFX",x: CX + GAP * 2, y: CY },
  { label: "Headphones",  sublabel: "Player experience",      x: CX + GAP * 3, y: CY },
];

const STAGGER = 20; // frames between each node appearing

export const Architecture: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title fades in at frame 0
  const titleOpacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Each node springs in with stagger
  const nodeOpacities = nodes.map((_, i) => {
    const startFrame = STAGGER * i;
    return interpolate(frame, [startFrame, startFrame + 20], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  // Arrows appear after the node at each end is visible
  const arrowOpacities = nodes.slice(0, -1).map((_, i) => {
    const startFrame = STAGGER * i + 30;
    return interpolate(frame, [startFrame, startFrame + 15], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  });

  const arrowLabels = ["PCM audio", "turns", "", "function", "mixer", "stereo"];

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.black }}>
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: FONTS.display,
          fontSize: 32,
          letterSpacing: "0.2em",
          color: COLORS.muted,
          opacity: titleOpacity,
          textTransform: "uppercase",
        }}
      >
        Architecture
      </div>

      {/* Arrows (rendered beneath nodes) */}
      {nodes.slice(0, -1).map((node, i) => (
        <Arrow
          key={`arrow-${i}`}
          x1={node.x + 90}
          y1={node.y}
          x2={nodes[i + 1].x - 90}
          y2={nodes[i + 1].y}
          opacity={arrowOpacities[i]}
          label={arrowLabels[i]}
        />
      ))}

      {/* Nodes */}
      {nodes.map((node, i) => (
        <ArchNode
          key={`node-${i}`}
          label={node.label}
          sublabel={node.sublabel}
          x={node.x}
          y={node.y}
          opacity={nodeOpacities[i]}
          accent={node.accent}
        />
      ))}
    </AbsoluteFill>
  );
};
