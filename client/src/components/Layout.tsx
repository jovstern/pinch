import { Link, NavLink, Outlet, useLocation, useMatch } from "react-router";
import { Button } from "./Button.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

// Every screen sits in this frame: the name (home) and New recipe (design §14).
export function Layout() {
  const { pathname } = useLocation();
  const reviewing = useMatch("/imports/:id") !== null;
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="text-2xl font-bold tracking-tight text-accent">
            Pinch
          </Link>
          {/* Secondary: each screen's main action is on the page (on /, pasting a link). Hidden
              where Save is the main action: on /recipes/new (NavLink sets aria-current=page
              there) and on a review. */}
          {!reviewing && (
            <Button asChild variant="secondary" className="aria-[current=page]:hidden">
              <NavLink to="/recipes/new">New recipe</NavLink>
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
