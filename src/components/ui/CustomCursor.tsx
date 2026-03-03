"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

function subscribeToMediaQuery(query: string, onChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia(query);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getMediaQuerySnapshot(query: string) {
  if (typeof window === "undefined") return false;
  return window.matchMedia(query).matches;
}

export function CustomCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const isDesktop = useSyncExternalStore(
    (onChange) =>
      subscribeToMediaQuery("(hover: hover) and (pointer: fine)", onChange),
    () => getMediaQuerySnapshot("(hover: hover) and (pointer: fine)"),
    () => false
  );
  const reducedMotion = useSyncExternalStore(
    (onChange) =>
      subscribeToMediaQuery("(prefers-reduced-motion: reduce)", onChange),
    () => getMediaQuerySnapshot("(prefers-reduced-motion: reduce)"),
    () => false
  );
  const mousePos = useRef({ x: -100, y: -100 });
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (!isDesktop || reducedMotion) return;

    const dot = dotRef.current;
    const circle = circleRef.current;
    if (!dot || !circle) return;

    let isHovering = false;

    const onMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };

    const updatePosition = () => {
      const { x, y } = mousePos.current;
      if (dot) {
        dot.style.transform = `translate3d(${x - 5}px, ${y - 5}px, 0)`;
      }
      if (circle) {
        circle.style.left = `${x}px`;
        circle.style.top = `${y}px`;
      }
      rafId.current = requestAnimationFrame(updatePosition);
    };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("a, button, [role='button'], [data-cursor-hover]")
      ) {
        if (!isHovering) {
          isHovering = true;
          circle.classList.add("active");
        }
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest("a, button, [role='button'], [data-cursor-hover]")
      ) {
        isHovering = false;
        circle.classList.remove("active");
      }
    };

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseover", onMouseOver, { passive: true });
    document.addEventListener("mouseout", onMouseOut, { passive: true });
    rafId.current = requestAnimationFrame(updatePosition);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      cancelAnimationFrame(rafId.current);
    };
  }, [isDesktop, reducedMotion]);

  if (!isDesktop || reducedMotion) return null;

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#fff",
          mixBlendMode: "difference",
          pointerEvents: "none",
          zIndex: 2147483647,
          willChange: "transform",
        }}
      />
      <div
        ref={circleRef}
        className="cursor-circle"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: 80,
          height: 80,
          borderRadius: "50%",
          border: "1.5px solid #fff",
          background: "transparent",
          mixBlendMode: "difference",
          pointerEvents: "none",
          zIndex: 2147483647,
          willChange: "transform",
          transform: "translate(-50%, -50%) scale(0.1)",
          transition: "transform 0.3s ease",
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `.cursor-circle.active { transform: translate(-50%, -50%) scale(1) !important; }` }} />
    </>
  );
}
