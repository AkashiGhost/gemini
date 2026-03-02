"use client";

import { useState, useEffect } from "react";

interface FogLayerProps {
  phase?: number;
  reduceLayers?: boolean;
}

export function FogLayer({ reduceLayers = false }: FogLayerProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.matchMedia("(hover: none)").matches);
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      {/* Fog layer 1 */}
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          background:
            "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(30,30,30,0.6), transparent)",
          animation: "fog-drift-a 30s ease-in-out infinite alternate",
        }}
      />
      {/* Fog layer 2 — hidden on mobile for perf */}
      {!(isMobile || reduceLayers) && (
        <div
          style={{
            position: "absolute",
            inset: "-20%",
            background:
              "radial-gradient(ellipse 70% 50% at 70% 60%, rgba(20,20,20,0.4), transparent)",
            animation: "fog-drift-b 39s ease-in-out infinite alternate",
          }}
        />
      )}
    </div>
  );
}
