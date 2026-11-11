import { Button } from "../../components/ui/Button.tsx";
import { AuthFrame } from "./AuthFrame.tsx";

// Who's signed in couldn't be asked (offline, a 500): without it no page knows what to show, so
// this says so, with Try again (SessionGate). In Log in's frame, as nobody is known to be signed
// in. It's in the entry (it shows when the network is gone, so no chunk can load), so the logo is
// the file, not Log in's inline Wordmark, which would cost every page its paths.
export function SessionError({ retry, retrying }: { retry: () => void; retrying: boolean }) {
  return (
    <AuthFrame
      title="We couldn't reach Pinch"
      tabTitle="We couldn't reach Pinch"
      role="alert"
      logo={
        <picture>
          <source media="(prefers-color-scheme: dark)" srcSet="/logo-dark.svg" />
          <img src="/logo.svg" alt="Pinch" width={79} height={32} className="h-10 w-auto" />
        </picture>
      }
    >
      <p className="mt-3 text-pretty text-text-muted">Check your connection, then try again.</p>
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
        {retrying ? "Trying…" : "Try again"}
      </Button>
    </AuthFrame>
  );
}
