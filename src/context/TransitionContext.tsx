"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";

interface TransitionContextValue {
  isTransitioning: boolean;
  triggerTransition: (href: string) => void;
}

const TransitionContext = createContext<TransitionContextValue | null>(null);

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const triggerTransition = useCallback(
    (href: string) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      router.push(href);
      setIsTransitioning(false);
    },
    [router, isTransitioning],
  );

  return (
    <TransitionContext.Provider value={{ isTransitioning, triggerTransition }}>
      {children}
    </TransitionContext.Provider>
  );
}

export function useTransition(): TransitionContextValue {
  const ctx = useContext(TransitionContext);
  if (!ctx) {
    // Fallback for components outside provider
    return {
      isTransitioning: false,
      triggerTransition: () => {},
    };
  }
  return ctx;
}
