import { Link, Outlet } from "react-router";

// Every screen sits in this frame: the name (home) and the one primary action (design §14).
export function Layout() {
  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="text-2xl font-bold tracking-tight text-accent">
            Pinch
          </Link>
          <Link
            to="/recipes/new"
            className="inline-flex min-h-11 items-center rounded-lg bg-accent-strong px-4 font-semibold text-white hover:bg-accent-strong/90"
          >
            New recipe
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </>
  );
}
