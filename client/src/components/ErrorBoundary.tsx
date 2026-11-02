import { Component, type ReactNode } from "react";

type ErrorBoundaryProps = { children: ReactNode };

// Catches what a screen throws while rendering, such as a lazy chunk that won't load (offline,
// or a new deploy), so the header stays and the user can get going again (react-vite.md).
// React has no hook for this yet, so it's the one class component.
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert">
        <h1 className="text-3xl font-bold tracking-tight text-balance">This page didn't load</h1>
        <p className="mt-3 text-pretty text-text-muted">
          Check your connection, then reload the page.
        </p>
      </div>
    );
  }
}
