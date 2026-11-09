import { Outlet, useLocation, useMatch } from "react-router";
import { cn } from "../lib/cn.ts";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { Header } from "./Header.tsx";

// Every screen sits in this frame: the header with the two tabs (design §14, D24).
export function Layout() {
  const { pathname } = useLocation();
  // The two tabs' own pages, where Write a recipe floats on a phone.
  const onTabPage = [useMatch("/"), useMatch("/recipes")].some((match) => match !== null);
  return (
    <>
      <Header onTabPage={onTabPage} />
      {/* wrap-anywhere: a long URL or word in a recipe wraps instead of widening the page. Room
          at the bottom on a phone, so the floating button never covers the last item. */}
      <main
        className={cn(
          "mx-auto max-w-3xl px-4 py-8 wrap-anywhere sm:px-6",
          onTabPage && "pb-28 md:pb-8",
        )}
      >
        {/* Keyed by address: going to another page clears a failure. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </>
  );
}
