import { Link, Outlet, useLocation, useMatch } from "react-router";
import { Button } from "./Button.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

// Every screen sits in this frame: the name (home) and New recipe (design §14).
export function Layout() {
  const { pathname } = useLocation();
  // The recipe form's pages: there Save is the main action, and New recipe would compete.
  const onForm = [
    useMatch("/recipes/new"),
    useMatch("/recipes/:id/edit"),
    useMatch("/imports/:id"),
  ].some((match) => match !== null);
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="font-display text-2xl font-bold tracking-tight text-accent">
            Pinch
          </Link>
          {/* Secondary: each screen's main action is on the page (on /, pasting a link). */}
          {!onForm && (
            <Button asChild variant="secondary">
              <Link to="/recipes/new">New recipe</Link>
            </Button>
          )}
        </div>
      </header>
      {/* wrap-anywhere: a long URL or word in a recipe wraps instead of widening the page. */}
      <main className="mx-auto max-w-3xl px-4 py-8 wrap-anywhere sm:px-6">
        {/* Keyed by address: going to another page clears a failure. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </>
  );
}
