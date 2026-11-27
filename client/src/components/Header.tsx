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
import { Logo } from "./Logo.tsx";
import { Badge } from "./ui/Badge.tsx";
import { Button } from "./ui/Button.tsx";

// The tab that owns each page (design §14, D24): an inner page keeps its tab selected. A page
// of no tab (not found) selects none.
function tabOf(pathname: string) {
  if (pathname === "/" || pathname === "/recipes/new" || pathname.startsWith("/imports/")) {
    return "new";
  }
  if (pathname === "/recipes" || pathname.startsWith("/recipes/")) return "recipes";
  if (pathname === "/explore") return "all";
  return null;
}

// shadcn's TabsTrigger look; the selected one is lifted out of the row. On a phone the three
// share what the logo and the avatar leave of the row: tight at the sides, lower (36 px; the
// after: keeps the touch area 44), without My recipes' count, and their text as large as the
// width lets it be, from 13 px up to the page's 16 (at 457 px). Their own size from 768 px.
const tabClass =
  "relative inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-control px-0.5 text-[clamp(0.8125rem,3.5vw,1rem)] font-medium whitespace-nowrap text-muted-foreground after:absolute after:inset-x-0 after:-inset-y-1 aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm md:min-h-11 md:gap-1.5 md:px-3 md:after:hidden";

// The app's frame, on every page (design §14, D24): the logo, the three tabs, Write a recipe and
// the avatar, and the imports read for the tab's count. One row: the logo at the start, the
// tabs, the rest at the end; on a phone the tabs take what's left, from 768 px they are in the
// header's true centre (the user's call, 2026-11-14). Under 375 px, where they don't fit beside
// the logo, the tabs have a row of their own. Write a recipe floats bottom right below 1024 px
// (on Add recipe and My recipes), and is by the avatar from there. Hebrew is its mirror (§16.4).
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
    // A grid of named areas, so each width places the same three parts, kept in the tab order:
    // the logo, the tabs, then Write a recipe and the avatar. Its two outer columns share what's
    // left equally, so the middle one is the header's true centre (where the tabs go from
    // 1024 px). The grid follows dir, so Hebrew needs no classes of its own.
    <header
      className={cn(
        "grid items-center gap-x-4 gap-y-2 px-4 pt-3 md:border-b md:border-border md:px-6 md:py-3",
        // Not on paper, on any page: a printed page is only its content (design D49).
        "print:hidden",
        // Under 375 px two rows: the logo and the avatar, then the tabs.
        "grid-cols-[1fr_auto_1fr] [grid-template-areas:'logo_._end'_'nav_nav_nav']",
        // From there one row.
        "min-[23.4375rem]:[grid-template-areas:'logo_nav_end']",
        // On a phone the tabs take what the logo and the avatar leave, all three close to each
        // other and to the screen's edges, to fit.
        "min-[23.4375rem]:max-md:grid-cols-[auto_minmax(0,1fr)_auto] min-[23.4375rem]:max-md:gap-x-2 min-[23.4375rem]:max-md:px-2",
      )}
    >
      {/* The logo (D24), the "Pinch" wordmark, as files in public/: inlined, its paths would
          cost the bundle (docs/metrics). In the dark accent in the dark theme (Logo). Asked
          for at low priority, so it waits behind what the page's content needs (LCP). The focus
          ring is the logo's (! over the global ring, which is outside Tailwind's layers). */}
      <Link
        to="/"
        aria-label={t("header.home")}
        className="group flex min-h-11 items-center justify-self-start [grid-area:logo] focus-visible:outline-none!"
      >
        <Logo
          fetchPriority="low"
          className="h-7 rounded-sm group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring md:h-8"
        />
      </Link>
      {/* Links in a nav, not Radix Tabs: each tab is its own page with its own address, and
          Radix Tabs is for panels that switch within one page. It only borrows their look. */}
      <nav
        aria-label={t("header.nav")}
        // Cut at its edge on a phone: in a system font wider than the one measured, a label would
        // otherwise run over the avatar.
        className="flex rounded-control bg-muted p-1 [grid-area:nav] max-md:overflow-x-clip md:justify-self-center"
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
              {/* On a phone on the tab's top corner, as an app's count: in the row it would
                  take the width the labels need. */}
              <Badge className="min-w-6 px-1.5 py-0 text-xs font-semibold max-md:absolute max-md:end-0 max-md:-top-1.5 max-md:min-w-4 max-md:px-1 max-md:text-[0.6875rem]">
                {ready}
              </Badge>{" "}
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
              <span className="text-muted-foreground tabular-nums max-md:sr-only md:text-sm">
                {recipeCount}
              </span>{" "}
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
        {/* One link, placed by width: floating below 1024 px (in thumb reach, on Add recipe and
            My recipes only; in the header it would push the tabs to a second row), in the header
            from 1024 px on every page. Floating, it comes after the tabs in the tab order though
            it shows at the bottom: fine for the header's one action. z-10: over My recipes' cards, which are positioned (the site's label on the
            picture). */}
        <Button
          asChild
          variant="outline"
          className={cn(
            "lg:static lg:inline-flex lg:rounded-control lg:shadow-none",
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
