import { useQuery } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { LazyUserMenu } from "../features/auth/LazyUserMenu.tsx";
import { meQuery } from "../features/auth/authQueries.ts";
import { importListQuery } from "../features/imports/importQueries.ts";
import { recipeCountQuery } from "../features/recipes/recipeQueries.ts";
import { cn } from "../lib/cn.ts";
import { Badge } from "./ui/Badge.tsx";
import { Button } from "./ui/Button.tsx";

// The tab that owns each page (design §14, D24): an inner page keeps its tab selected. A page
// of none (not found) selects none.
function tabOf(pathname: string) {
  if (pathname === "/" || pathname === "/recipes/new" || pathname.startsWith("/imports/")) {
    return "new";
  }
  if (pathname === "/recipes" || pathname.startsWith("/recipes/")) return "recipes";
  if (pathname === "/explore") return "all";
  return null;
}

// shadcn's TabsTrigger look; the selected one is lifted out of the row. On a phone the three
// share the row's width, tighter and a size smaller, so they fit with their counts ("Add recipe
// 13", "My recipes 120") at 360 px, and smaller again under it, for 320 px.
const tabClass =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-control px-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm max-[22.5rem]:px-1 max-[22.5rem]:text-[0.8125rem] sm:gap-1.5 sm:px-3 sm:text-base";

// The app's frame, on every page (design §14, D24): the logo, the three tabs, Write a recipe and
// the avatar, and the imports read for the tab's count. Two rows: the logo and the avatar, then
// the tabs (the row's width on a phone; from 768 px as wide as they need, under the logo).
// Write a recipe floats bottom right on a phone (on Add recipe and My recipes), and is by the
// avatar from 768 px. One row from 1024 px: the logo and the tabs at the start, the rest at the
// end. In Hebrew the logo is in the middle of the header's width at every width (§16.4: the one
// thing not mirrored), the tabs under it, and one row only from 1440 px, the first width where
// the tabs, Write a recipe and the avatar fit in the half beside the logo.
export function Header({ onTabPage }: { onTabPage: boolean }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const tab = tabOf(pathname);
  // The same query as the queue on Add recipe, so the count moves as it polls (§4.2).
  const { data } = useQuery(importListQuery);
  const ready = data?.items.filter((job) => job.status === "ready").length ?? 0;
  // Not awaited by anything: the tab shows its count once it's there, a second in (useAfterStart).
  const countWanted = useAfterStart();
  const recipeCount = useQuery({ ...recipeCountQuery, enabled: countWanted }).data?.count;
  const me = useQuery(meQuery).data;

  return (
    // A grid of named areas, so each width and direction places the same three parts, kept in
    // the tab order: the logo, the tabs, then Write a recipe and the avatar. Its two outer
    // columns share what's left equally, so the middle one is the header's true centre (where
    // the Hebrew logo goes). In Hebrew's one row the tabs share the end's cell, at its start.
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 gap-y-2 px-4 pt-3 [grid-template-areas:'logo_._end'_'nav_nav_nav'] md:border-b md:border-border md:px-6 md:py-3 lg:ltr:grid-cols-[auto_auto_1fr] lg:ltr:[grid-template-areas:'logo_nav_end'] rtl:[grid-template-areas:'._logo_end'_'nav_nav_nav'] min-[90rem]:rtl:[grid-template-areas:'._logo_end']">
      {/* The logo (D24), the "Pinch" wordmark, as files in public/: inlined, its paths would
          cost the bundle (docs/metrics). In the dark accent in the dark theme. Its height is
          set and the file gives its width, so nothing moves as it loads; asked for at low
          priority, so it waits behind what the page's content needs (LCP). The focus ring is
          the logo's (! over the global ring, which is outside Tailwind's layers). */}
      <Link
        to="/"
        aria-label={t("header.home")}
        className="group flex min-h-11 items-center justify-self-start [grid-area:logo] focus-visible:outline-none!"
      >
        <picture>
          <source media="(prefers-color-scheme: dark)" srcSet="/logo-dark.svg" />
          <img
            src="/logo.svg"
            alt="Pinch"
            width={79}
            height={32}
            fetchPriority="low"
            className="h-8 w-auto rounded-sm group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring"
          />
        </picture>
      </Link>
      {/* Links in a nav, not Radix Tabs: each tab is its own page with its own address, and
          Radix Tabs is for panels that switch within one page. It only borrows their look. */}
      <nav
        aria-label={t("header.nav")}
        className="flex rounded-control bg-muted p-1 [grid-area:nav] md:justify-self-start rtl:md:justify-self-center min-[90rem]:rtl:justify-self-start min-[90rem]:rtl:[grid-area:end]"
      >
        <Link to="/" aria-current={tab === "new" ? "page" : undefined} className={tabClass}>
          {t("header.addRecipe")}
          {/* A bare "2" says nothing to a screen reader: the hidden words say what it counts
              ("Add recipe 2 ready to review"). Not an aria-label: axe reads the visible text as
              "Add recipe2", which no label contains (label-content-name-mismatch). The spaces
              part the words when read; flex drops them on screen. */}
          {ready > 0 && (
            <>
              {" "}
              <Badge className="min-w-6 px-1.5 py-0 text-xs font-semibold">{ready}</Badge>{" "}
              <span className="sr-only">{t("header.readyToReview")}</span>
            </>
          )}
        </Link>
        <Link
          to="/recipes"
          aria-current={tab === "recipes" ? "page" : undefined}
          className={tabClass}
        >
          {t("header.myRecipes")}
          {/* How many there are, quiet: it informs, it doesn't ask for anything (the ready count
              does). Said as the ready count is, with hidden words: "My recipes 12 recipes". */}
          {recipeCount !== undefined && recipeCount > 0 && (
            <>
              {" "}
              <span className="text-sm text-muted-foreground tabular-nums">{recipeCount}</span>{" "}
              <span className="sr-only">{t("header.recipeCount", { count: recipeCount })}</span>
            </>
          )}
        </Link>
        {/* The recipes saved across Pinch: a Coming soon page for now (§14.1). Last: the tabs
            go from the user's own work outward. */}
        <Link to="/explore" aria-current={tab === "all" ? "page" : undefined} className={tabClass}>
          {t("header.allRecipes")}
        </Link>
      </nav>

      <div className="flex items-center gap-4 justify-self-end [grid-area:end]">
        {/* One link, placed by width: floating on a phone (in thumb reach, on Add recipe and My
            recipes only), in the header from 768 px on every page. On a phone it comes after
            the tabs in the tab order though it shows at the bottom: fine for the header's one
            action. z-10: over My recipes' cards, which are positioned (the site's label on the
            picture). */}
        <Button
          asChild
          variant="outline"
          className={cn(
            "md:static md:inline-flex md:rounded-control md:shadow-none",
            onTabPage ? "fixed end-4 bottom-5 z-10 rounded-full shadow-sheet" : "hidden",
          )}
        >
          <Link to="/recipes/new" aria-current={pathname === "/recipes/new" ? "page" : undefined}>
            <PenLine aria-hidden="true" className="size-4" />
            {t("header.writeRecipe")}
          </Link>
        </Button>

        {/* The avatar opens the user's menu: their name, and Log out (design §14). SessionGate
            only shows the page once me is known, so it's here; the check is for TypeScript. */}
        {me && <LazyUserMenu me={me} />}
      </div>
    </header>
  );
}

// The count isn't urgent: asked for a second after the app starts, it keeps out of the way of
// the page's own first requests, on every page (cook and the editor too). Asked with them, it
// cost My recipes 0.2 s of LCP (docs/metrics/m08.md). A timer: something outside React.
const countDelay = 1000;
function useAfterStart() {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setStarted(true);
    }, countDelay);
    return () => {
      clearTimeout(timer);
    };
  }, []);
  return started;
}
