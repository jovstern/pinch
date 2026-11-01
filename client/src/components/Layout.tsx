import { Link, NavLink, Outlet } from "react-router";
import { Button } from "./Button.tsx";

// Every screen sits in this frame: the name (home) and the one primary action (design §14).
export function Layout() {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="text-2xl font-bold tracking-tight text-accent">
            Pinch
          </Link>
          {/* Hidden on its own page (NavLink marks it aria-current), where Save is the one
              primary action. */}
          <Button asChild variant="primary" className="aria-[current=page]:hidden">
            <NavLink to="/recipes/new">New recipe</NavLink>
          </Button>
        </div>
      </header>
      {/* wrap-anywhere: a long URL or word in a recipe wraps instead of widening the page. */}
      <main className="mx-auto max-w-3xl px-4 py-8 wrap-anywhere sm:px-6">
        <Outlet />
      </main>
    </>
  );
}
