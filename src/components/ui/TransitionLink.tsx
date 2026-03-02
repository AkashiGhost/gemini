"use client";

import { type ReactNode, type MouseEvent } from "react";
import { useTransition } from "@/context/TransitionContext";

interface TransitionLinkProps {
  href: string;
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export function TransitionLink({ href, children, style, className }: TransitionLinkProps) {
  const { triggerTransition } = useTransition();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    triggerTransition(href);
  };

  const defaultStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    minHeight: "var(--touch-min)",
  };

  return (
    <a href={href} onClick={handleClick} style={{ ...defaultStyle, ...style }} className={className}>
      {children}
    </a>
  );
}
