import { useQuery } from "@tanstack/react-query";
import { PenLine, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router";
import { importListQuery } from "../features/imports/importQueries.ts";
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

// shadcn's TabsTrigger look; the selected one is lifted out of the row.
const tabClass =
  "inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-control px-3 font-medium whitespace-nowrap text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-sm";

// The app's frame, on every page (design §14, D24): the two tabs, Write a recipe and the avatar,
// and the imports read for the tab's count. No logo for now. Phone: the tabs fill the row beside the avatar, and Write a recipe floats
// bottom right on the two tabs' own pages. From 768 px: the tabs left, the rest right.
export function Header({ onTabPage }: { onTabPage: boolean }) {
  const { pathname } = useLocation();
  const tab = tabOf(pathname);
  // The same query as the queue on Add recipe, so the count moves as it polls (§4.2).
  const { data } = useQuery(importListQuery);
  const ready = data?.items.filter((job) => job.status === "ready").length ?? 0;

  return (
    <header className="flex items-center gap-2 px-4 pt-3 md:gap-4 md:border-b md:border-border md:px-6 md:py-3">
      {/* Links in a nav, not Radix Tabs: each tab is its own page with its own address, and
          Radix Tabs is for panels that switch within one page. It only borrows their look. */}
      <nav
        aria-label="Main"
        className="flex flex-1 rounded-control bg-muted p-1 md:w-88 md:flex-none"
      >
        <Link to="/" aria-current={tab === "new" ? "page" : undefined} className={tabClass}>
          Add recipe
          {/* A bare "2" says nothing to a screen reader: the hidden words say what it counts
              ("Add recipe 2 ready to review"). Not an aria-label: axe reads the visible text as
              "Add recipe2", which no label contains (label-content-name-mismatch). The spaces
              part the words when read; flex drops them on screen. */}
          {ready > 0 && (
            <>
              {" "}
              <Badge className="min-w-6 px-1.5 py-0 text-xs font-semibold">{ready}</Badge>{" "}
              <span className="sr-only">ready to review</span>
            </>
          )}
        </Link>
        <Link
          to="/recipes"
          aria-current={tab === "recipes" ? "page" : undefined}
          className={tabClass}
        >
          My recipes
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
          "md:static md:ml-auto md:inline-flex md:rounded-control md:shadow-none",
          onTabPage ? "fixed right-4 bottom-5 z-10 rounded-full shadow-sheet" : "hidden",
        )}
      >
        <Link to="/recipes/new" aria-current={pathname === "/recipes/new" ? "page" : undefined}>
          <PenLine aria-hidden="true" className="size-4" />
          Write a recipe
        </Link>
      </Button>

      {/* A placeholder until auth (design §8.3, D13), as Share is (§1): unavailable, not
          hidden, and in the tab order so it can be read. A menu with nothing to choose in it
          would be more code for the same message. */}
      <Button
        type="button"
        variant="secondary"
        aria-disabled="true"
        aria-label="Log in · coming soon"
        className="size-11 shrink-0 rounded-full px-0 text-muted-foreground"
      >
        <UserRound aria-hidden="true" className="size-5" />
      </Button>
    </header>
  );
}
