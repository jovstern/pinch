import { lazy, Suspense, type ComponentType } from "react";
import { Outlet, useLocation } from "react-router";
import { useImportToasts } from "../features/imports/useImportToasts.ts";
import { cn } from "../lib/cn.ts";
import { useToastSent } from "../lib/toasts.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import { Header } from "./Header.tsx";

// Its own chunk, with Sonner, fetched with the first toast (lib/toasts.tsx), which shows once it's
// there. No fallback: there is nothing else to show. A chunk that won't load means no toasts, not
// a broken page (the ErrorBoundary is around the page, not the frame).
const Toaster = lazy<ComponentType<{ alwaysTop: boolean }>>(() =>
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
  const toastSent = useToastSent();
  // The two tabs' own pages, where Write a recipe floats on a phone.
  const onTabPage = pathname === "/" || pathname === "/recipes";
  // A recipe's own page, /recipes/<id>, and its cook mode: not /recipes/new, nor its edit page.
  const onRecipe = /^\/recipes\/[^/]+(\/cook)?$/.test(pathname) && pathname !== "/recipes/new";
  // The editor: writing a recipe, editing one, reviewing a draft.
  const onEditor = /^\/(recipes\/new|recipes\/[^/]+\/edit|imports\/[^/]+)$/.test(pathname);
  return (
    <>
      {/* At least the screen's height, so main can take what the header leaves (flex-1). svh, the
          height with the browser's bars showing: dvh would follow the URL bar as it hides and
          shift a centred block (ImportPage). */}
      <div className="flex min-h-svh flex-col">
        <Header onTabPage={onTabPage} />
        {/* wrap-anywhere: a long URL or word in a recipe wraps instead of widening the page. Room
          at the bottom on a phone, so the floating button never covers the last item. w-full:
          a flex item with auto margins would shrink to its content. */}
        <main
          className={cn(
            "mx-auto w-full max-w-3xl flex-1 px-4 py-8 wrap-anywhere sm:px-6",
            // Add recipe centres its field in the height left (ImportPage): a column, so its
            // my-auto has the room to share.
            pathname === "/" && "flex flex-col",
            // From 1024 px My recipes has a panel beside its grid, and a recipe its picture beside
            // the title and its ingredients beside the steps (in cook mode too): they take the width.
            (pathname === "/recipes" || onRecipe) && "max-w-7xl",
            // The editor's two columns, from 1024 px: what you edit, and the rest with Save.
            onEditor && "max-w-6xl",
            // An inner page starts with its breadcrumbs (D24), close under the header: their
            // 44 px rows have room in them.
            !onTabPage && "pt-2",
            onTabPage && "pb-24 md:pb-8",
          )}
        >
          {/* Keyed by address: going to another page clears a failure. */}
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
      {toastSent && (
        <Suspense>
          {/* At the top in the editor on every width: at the bottom they'd sit over its Save
              (pinned to the bottom up to 1024 px, at the foot of the right column from there). */}
          <Toaster alwaysTop={onEditor} />
        </Suspense>
      )}
    </>
  );
}
