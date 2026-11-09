import { lazy, Suspense, type ComponentType } from "react";
import { Outlet, useLocation } from "react-router";
import { useImportToasts } from "../features/imports/useImportToasts.ts";
import { cn } from "../lib/cn.ts";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { Header } from "./Header.tsx";

// Its own chunk, with Sonner, fetched as the app starts (lib/toasts.tsx). A toast sent before it
// is there shows once it is: Sonner gives a new Toaster the toasts still open. No fallback: there
// is nothing to show until a toast is sent. A chunk that won't load means no toasts, not a broken
// page (the ErrorBoundary is around the page, not the frame).
const Toaster = lazy<ComponentType>(() =>
  import("./ui/Toaster.tsx").then(
    (module) => ({ default: module.Toaster }),
    () => ({ default: () => null }),
  ),
);

// Every screen sits in this frame: the header with the two tabs (design §14, D24), and the
// toasts, so an import that becomes ready or fails says so on any page.
export function Layout() {
  const { pathname } = useLocation();
  useImportToasts();
  // The two tabs' own pages, where Write a recipe floats on a phone.
  const onTabPage = pathname === "/" || pathname === "/recipes";
  return (
    <>
      <Header onTabPage={onTabPage} />
      {/* wrap-anywhere: a long URL or word in a recipe wraps instead of widening the page. Room
          at the bottom on a phone, so the floating button never covers the last item. */}
      <main
        className={cn(
          "mx-auto max-w-3xl px-4 py-8 wrap-anywhere sm:px-6",
          // My recipes is a grid with a panel beside it from 1024 px: it takes the width.
          pathname === "/recipes" && "max-w-7xl",
          onTabPage && "pb-24 md:pb-8",
        )}
      >
        {/* Keyed by address: going to another page clears a failure. */}
        <ErrorBoundary key={pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
      <Suspense>
        <Toaster />
      </Suspense>
    </>
  );
}
