import { Link, Outlet, useLocation, useMatch } from "react-router";
import { Button } from "./Button.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

// Every screen sits in this frame: the name (home) and New recipe (design §14).
export function Layout() {
  const { pathname } = useLocation();
  // The recipe form's pages, where Save is the main action, and cook mode, where the cook is
  // busy: New recipe would compete.
  const hideNewRecipe = [
    useMatch("/recipes/new"),
    useMatch("/recipes/:id/edit"),
    useMatch("/imports/:id"),
    useMatch("/recipes/:id/cook"),
  ].some((match) => match !== null);
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-display text-2xl font-bold tracking-tight text-accent"
          >
            {/* The mark: two fingertips pinching, as on the favicon (plan §6); its 32×32 box cropped
                to the strokes and their round caps. */}
            <svg aria-hidden="true" viewBox="8 5 16 22" className="h-7 w-5">
              <path
                d="M11 25C11 17 13 11 15.5 7M21 25C21 17 19 11 16.5 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            Pinch
          </Link>
          {/* Secondary: each screen's main action is on the page (on /, pasting a link). */}
          {!hideNewRecipe && (
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
