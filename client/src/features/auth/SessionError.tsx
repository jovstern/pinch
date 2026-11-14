import { useTranslation } from "react-i18next";
import { Logo } from "../../components/Logo.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { AuthFrame } from "./AuthFrame.tsx";

// Who's signed in couldn't be asked (offline, a 500): without it no page knows what to show, so
// this says so, with Try again (SessionGate). In Log in's frame, as nobody is known to be signed
// in. It's in the entry (it shows when the network is gone, so no chunk can load), so the logo is
// the file, not Log in's inline Wordmark, which would cost every page its paths.
export function SessionError({ retry, retrying }: { retry: () => void; retrying: boolean }) {
  const { t } = useTranslation();
  return (
    <AuthFrame
      title={t("auth.cantReach")}
      tabTitle={t("auth.cantReach")}
      logo={<Logo className="h-10" />}
    >
      {/* The alert is the message alone, not the card: <main> keeps its own role (axe), and the
          button inside an alert would be read again on every try. */}
      <p role="alert" className="mt-3 text-pretty text-text-muted">
        {t("auth.checkAndTryAgain")}
      </p>
      {/* Not disabled while it asks, so focus stays on it (as Pinch it). */}
      <Button
        type="button"
        onClick={() => {
          if (!retrying) retry();
        }}
        aria-disabled={retrying}
        aria-busy={retrying}
        className="mt-6 w-full"
      >
        {retrying ? t("auth.trying") : t("auth.tryAgain")}
      </Button>
    </AuthFrame>
  );
}
