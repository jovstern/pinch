import { Component, type ReactNode } from "react";
import { CloudOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "./EmptyState.tsx";
import { Button } from "./ui/Button.tsx";

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

// A function component, for its t(): a class can't call a hook. Reload fetches the page again,
// with the new deploy's chunks. Filled (the default button): it is the page's only action.
function PageDidntLoad() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={CloudOff}
      as="h1"
      title={t("frame.didntLoad")}
      subtitle={t("frame.checkAndReload")}
      role="alert"
      action={
        <Button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
        >
          {t("frame.reload")}
        </Button>
      }
    />
  );
}
