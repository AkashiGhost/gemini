"use client";
import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message ?? "Unknown error";
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "100dvh",
          backgroundColor: "var(--black)", color: "var(--muted)", padding: "var(--space-lg)", textAlign: "center",
        }}>
          <p style={{
            fontSize: "var(--type-body)", fontFamily: "var(--font-literary)",
            fontStyle: "italic", marginBottom: "var(--space-sm)", color: "var(--error)",
          }}>
            Something went wrong.
          </p>
          <p style={{
            fontSize: "var(--type-caption)", fontFamily: "var(--font-ui)",
            color: "var(--muted)", marginBottom: "var(--space-md)",
            maxWidth: "500px", wordBreak: "break-word",
          }}>
            {errorMsg}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "none", border: "1px solid var(--muted)", color: "var(--muted)",
              padding: "var(--space-xs) var(--space-md)", borderRadius: 0, cursor: "pointer",
              fontFamily: "var(--font-ui)", fontSize: "var(--type-ui)",
              minHeight: 48,
            }}
          >
            Refresh
          </button>
          <a
            href="/"
            style={{
              marginTop: "var(--space-sm)",
              color: "var(--error)",
              fontFamily: "var(--font-literary)",
              fontSize: "var(--type-body)",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              minHeight: 48,
              padding: "8px 16px",
            }}
          >
            return home
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
