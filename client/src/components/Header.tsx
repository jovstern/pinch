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
// of neither (not found) selects none.
function tabOf(pathname: string) {
  if (pathname === "/" || pathname === "/recipes/new" || pathname.startsWith("/imports/")) {
    return "new";
  }
  if (pathname === "/recipes" || pathname.startsWith("/recipes/")) return "recipes";
  return null;
}

// shadcn's TabsTrigger look; the selected one is lifted out of the row. Tighter on a phone, and
// smaller under 360 px, so both tabs with their counts ("Add recipe 13", "My recipes 120") fit
// beside the avatar on a 320 px screen.
const tabClass =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-control px-2 font-medium whitespace-nowrap max-[22.5rem]:text-sm sm:gap-1.5 sm:px-3 text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm";

// The app's frame, on every page (design §14, D24): the logo, the two tabs, Write a recipe and
// the avatar, and the imports read for the tab's count. Phone: the P mark, then the tabs fill
// the row beside the avatar, and Write a recipe floats bottom right on the two tabs' own pages.
// From 768 px: the wordmark and the tabs left, the rest right.
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
    <header className="flex items-center gap-2 px-4 pt-3 md:gap-4 md:border-b md:border-border md:px-6 md:py-3">
      {/* The logo (D24), as files in public/: inlined, its paths would cost the bundle, which
          is at its budget (docs/metrics). The P mark on a phone, the wordmark from 768 px, each
          in the dark accent in the dark theme. Its height is set and the files give its width,
          so nothing moves as it loads; asked for at low priority, so it waits behind what the
          page's content needs (LCP). On a phone the 44 px target reaches into the gutter
          (-ms-4 ps-4, and -me-2 for the gap), so the mark lines up with the page's edge and
          takes 28 px from the tabs; under 360 px they need the whole row ("Add recipe 13",
          "My recipes 120"), so there is no mark there. The focus ring is the mark's: the
          target's would be cut off at the screen's edge (! over the global ring, which is
          outside Tailwind's layers). */}
      <Link
        to="/"
        aria-label={t("header.home")}
        className="group -ms-4 -me-2 hidden min-h-11 w-11 shrink-0 items-center ps-4 focus-visible:outline-none! min-[22.5rem]:flex md:mx-0 md:w-auto md:ps-0"
      >
        <picture>
          <source
            media="(min-width: 48rem) and (prefers-color-scheme: dark)"
            srcSet="/logo-dark.svg"
            width={79}
            height={32}
          />
          <source media="(min-width: 48rem)" srcSet="/logo.svg" width={79} height={32} />
          <source media="(prefers-color-scheme: dark)" srcSet="/logo-mark-dark.svg" />
          <img
            src="/logo-mark.svg"
            alt="Pinch"
            width={21}
            height={28}
            fetchPriority="low"
            className="h-7 w-auto rounded-sm group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-ring md:h-8"
          />
        </picture>
      </Link>
      {/* Links in a nav, not Radix Tabs: each tab is its own page with its own address, and
          Radix Tabs is for panels that switch within one page. It only borrows their look. */}
      <nav
        aria-label={t("header.nav")}
        className="flex flex-1 rounded-control bg-muted p-1 md:w-88 md:flex-none"
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
      </nav>

      {/* One link, placed by width: floating on a phone (in thumb reach, on the tabs' pages
          only), in the header from 768 px on every page. On a phone it comes after the tabs
          in the tab order though it shows at the bottom: fine for the header's one action.
          z-10: over My recipes' cards, which are positioned (the site's label on the picture). */}
      <Button
        asChild
        variant="outline"
        className={cn(
          "md:static md:ms-auto md:inline-flex md:rounded-control md:shadow-none",
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
