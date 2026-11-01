import { Link, NavLink, Outlet, useLocation } from "react-router";
import { Button } from "./Button.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";

// Every screen sits in this frame: the name (home) and the one primary action (design §14).
export function Layout() {
  const { pathname } = useLocation();
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="text-2xl font-bold tracking-tight text-accent">
            Pinch
          </Link>
          {/* NavLink sets aria-current=page on /recipes/new, and that hides it there: Save is
              the one primary action. */}
          <Button asChild variant="primary" className="aria-[current=page]:hidden">
            <NavLink to="/recipes/new">New recipe</NavLink>
          </Button>
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
