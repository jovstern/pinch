import { Component, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

type ErrorBoundaryProps = {
  children: ReactNode;
  // What shows instead; the page's message unless given (null: nothing, for a part of a page).
  fallback?: ReactNode;
};

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
    if (this.props.fallback !== undefined) return this.props.fallback;
    return <PageDidntLoad />;
  }
}

// A function component, for its t(): a class can't call a hook.
function PageDidntLoad() {
  const { t } = useTranslation();
  return (
    <div role="alert">
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">
        {t("frame.didntLoad")}
      </h1>
      <p className="mt-3 text-pretty text-text-muted">{t("frame.checkAndReload")}</p>
    </div>
  );
}
