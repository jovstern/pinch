import { Button } from "../../components/ui/Button.tsx";

// Who's signed in couldn't be asked (offline, a 500): without it no page knows what to show, so
// this says so, with Try again (SessionGate).
export function SessionError({ retry, retrying }: { retry: () => void; retrying: boolean }) {
  return (
    <main role="alert" className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <title>Can't reach Pinch · Pinch</title>
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">
        We couldn't reach Pinch
      </h1>
      <p className="mt-3 text-pretty text-text-muted">Check your connection, then try again.</p>
      <Button
        type="button"
        variant="secondary"
        onClick={retry}
        disabled={retrying}
        className="mt-3"
      >
        {retrying ? "Trying…" : "Try again"}
      </Button>
    </main>
  );
}
