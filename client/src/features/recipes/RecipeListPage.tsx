import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { X } from "lucide-react";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { cn } from "../../lib/cn.ts";
import { useHeadingFocus } from "../../lib/useHeadingFocus.ts";
import { LazyFiltersPanel } from "./LazyFiltersPanel.tsx";
import { ListFilters } from "./ListFilters.tsx";
import { RecipeCard } from "./RecipeCard.tsx";
import { appliedFilters } from "./filterLabels.ts";
import {
  filterParams,
  noFilters,
  PAGE_SIZE,
  readFilters,
  recipeListQuery,
  withoutFilters,
  type RecipeFilters,
} from "./recipeQueries.ts";

// The My recipes tab, at /recipes (design §14, D24).
export function RecipeListPage() {
  // The filters live in the address, so a reload, Back or a shared link keeps them (ui-craft).
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const applied = appliedFilters(filters);
  const filtering = filters.q !== "" || applied.length > 0;

  const {
    status,
    data,
    isLoadingError,
    refetch,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
    isPlaceholderData,
  } = useInfiniteQuery(recipeListQuery(filters));
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const headingRef = useHeadingFocus();
  // The first recipe of the page Show more asked for, to focus once it's drawn.
  const firstNewRef = useRef<number | null>(null);
  const recipes = data?.pages.flatMap((page) => page.items);

  // Design §14: focus goes to the first new recipe, so the keyboard carries on from there rather
  // than from the button below the new ones. In an effect that runs when a page arrives, because
  // fetchNextPage resolves before React draws it. (One link per card, so link n is recipe n.)
  useEffect(() => {
    if (firstNewRef.current === null) return;
    listRef.current?.querySelectorAll("a")[firstNewRef.current]?.focus();
    firstNewRef.current = null;
  }, [data]);

  function changeFilters(next: RecipeFilters) {
    // A Show more still on its way belongs to the list being left: don't focus into the next.
    firstNewRef.current = null;
    // replace: each tick or search changes the address in place; Back leaves the list rather
    // than undoing filters one by one.
    setSearchParams(filterParams(next), { replace: true });
  }

  // A tick, a chip or a Filters row: focus stays where it is.
  function changeTags(tags: string[]) {
    changeFilters({ ...filters, tags });
  }

  // For a button that clears filters and goes away with them (Clear all, Clear filters, Search
  // all…, a filter's ✕, the panel's Clear): focus moves to the search box, where the next search
  // starts, rather than falling to the page.
  function clearFilters(next: RecipeFilters) {
    changeFilters(next);
    searchRef.current?.focus();
  }

  function showMore() {
    // Not disabled while loading: a disabled button loses focus, and the keyboard with it.
    if (isFetchingNextPage) return;
    firstNewRef.current = recipes?.length ?? 0;
    void fetchNextPage().then((result) => {
      // Nothing new to focus; focus stays on the button, next to the alert.
      if (result.isError) firstNewRef.current = null;
    });
  }

  // By the data, not the status: a failed next page or refetch turns the status to "error" and
  // keeps the list.
  const noMatch = filtering && !isPlaceholderData && recipes?.length === 0;
  // What narrowed it, as typed and picked: “soup”, 30 min or less, italian.
  const asked = applied.map(({ label }) => label);
  if (filters.q !== "") asked.unshift(`“${filters.q}”`);
  // Not before the first recipe: there's nothing to search yet. Known only once a list without
  // filters has loaded, so the search box stays while one loads (it keeps its focus).
  const noRecipesYet = !filtering && !isPlaceholderData && recipes?.length === 0;

  return (
    <>
      <title>My recipes · Pinch</title>
      {/* The selected tab names the page on screen; the heading names it for screen readers. */}
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        My recipes
      </h1>

      {/* From 1024 px the panel's ~35 checkboxes come first, on screen and to the keyboard
          (ui-craft: the keyboard goes in visual order): a skip button, shown (pushing the page
          down) while focused, goes past them to the search. Below 1024 px the Filters are one button. */}
      {!noRecipesYet && (
        <Button
          type="button"
          variant="secondary"
          className="sr-only focus-visible:not-sr-only focus-visible:mb-3 focus-visible:px-4 max-lg:hidden"
          onClick={() => {
            searchRef.current?.focus();
          }}
        >
          Skip the filters
        </Button>
      )}

      {/* Two columns from 1024 px: the Filters panel and the grid. */}
      <div className="lg:flex lg:gap-8">
        {!noRecipesYet && (
          <LazyFiltersPanel
            filters={filters}
            onChange={changeFilters}
            filtered={applied.length > 0}
            onClear={() => {
              clearFilters(withoutFilters(filters));
            }}
          />
        )}

        <div className="min-w-0 flex-1">
          {!noRecipesYet && (
            <>
              <ListFilters
                filters={filters}
                onChange={changeFilters}
                onChangeTags={changeTags}
                searchRef={searchRef}
              />
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                {/* Announced as results arrive (ui-craft: aria-live for async results); blank
                    while the list before them shows. Never hidden: a live region must be on the
                    page before its text changes, or screen readers may miss it. When nothing
                    matches, the block below says it on screen. */}
                <p
                  role="status"
                  className={cn("text-sm text-muted-foreground", noMatch && "sr-only")}
                >
                  {filtering &&
                    recipes !== undefined &&
                    !isPlaceholderData &&
                    matches(recipes.length, hasNextPage, filters.q !== "")}
                </p>
                {/* From 1024 px the filters repeat here, each removable, so what narrows the grid
                    shows beside it (on a phone the chips and the Filters badge say it). The ✕
                    keeps the badge's size; its after: gives it a 44 px touch area. */}
                {applied.map(({ label, without }) => (
                  <Badge key={label} variant="secondary" className="hidden gap-0 py-0 pr-0 lg:flex">
                    {label}
                    <Button
                      type="button"
                      variant="ghost"
                      aria-label={`Remove ${label}`}
                      className="relative min-h-8 rounded-full px-2 after:absolute after:-inset-x-1.5 after:-inset-y-1.5 after:content-['']"
                      onClick={() => {
                        clearFilters(without);
                      }}
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </Button>
                  </Badge>
                ))}
                {filtering && recipes?.length !== 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-2 text-sm underline underline-offset-4"
                    onClick={() => {
                      clearFilters({ ...noFilters, sort: filters.sort });
                    }}
                  >
                    Clear all
                  </Button>
                )}
              </div>
            </>
          )}

          {status === "pending" && (
            <>
              <p className="sr-only">Loading your recipes…</p>
              {/* Placeholders in the cards' shape, so nothing jumps when they arrive. */}
              <ul aria-hidden="true" className={gridClasses}>
                {[1, 2, 3, 4].map((n) => (
                  <li key={n}>
                    <Skeleton className="aspect-4/5 rounded-card" />
                    <Skeleton className="mt-2 h-5 w-3/4" />
                    <Skeleton className="mt-1 h-4 w-1/2" />
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Only when nothing has loaded: a failed refetch or next page keeps the list on screen. */}
          {/* Centred, as the empty states. */}
          {isLoadingError && (
            <div role="alert" className="mt-10 text-center">
              <h2 className="text-xl font-semibold">We couldn't load your recipes</h2>
              {/* The status stays "error" while it retries, so the button shows the wait. */}
              <Button
                type="button"
                variant="secondary"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="mt-4"
              >
                {isFetching ? "Trying…" : "Try again"}
              </Button>
            </div>
          )}

          {noMatch && (
            <div className="mt-10 text-center">
              <h2 className="text-xl font-semibold">No recipes match</h2>
              <p dir="auto" className="mt-2 text-pretty text-muted-foreground">
                {asked.join(", ")}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={() => {
                  clearFilters({ ...noFilters, sort: filters.sort });
                }}
              >
                {/* Named for what it clears: only a search is on, or filters too. */}
                {applied.length === 0 ? "Clear search" : "Clear filters"}
              </Button>
              {/* The words may be there without the filters. */}
              {filters.q !== "" && applied.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="mx-auto mt-2 flex underline underline-offset-4"
                  onClick={() => {
                    clearFilters(withoutFilters(filters));
                  }}
                >
                  Search all recipes for “{filters.q}”
                </Button>
              )}
            </div>
          )}

          {noRecipesYet && (
            <div className="mt-16 text-center">
              <h2 className="text-xl font-semibold">No recipes yet</h2>
              <p className="mt-2 text-pretty text-muted-foreground">
                Pinch one from a reel, or write your own.
              </p>
              {/* Write a recipe is already on the page (Header). */}
              <Button asChild className="mt-4">
                <Link to="/">Pinch a recipe</Link>
              </Button>
            </div>
          )}

          {recipes !== undefined && recipes.length > 0 && (
            <ul
              ref={listRef}
              aria-busy={isPlaceholderData}
              className={cn(gridClasses, isPlaceholderData && "opacity-60")}
            >
              {recipes.map((recipe, index) => (
                <li key={recipe.id}>
                  {/* The first row on a phone (two columns): its pictures are the page's largest
                      thing, so they don't wait to be found near the screen (docs/metrics/m08.md). */}
                  <RecipeCard recipe={recipe} eager={index < 2} />
                </li>
              ))}
            </ul>
          )}

          {isFetchNextPageError && (
            <p role="alert" className="mt-6 text-danger">
              We couldn't load more recipes. Press Show more to try again.
            </p>
          )}
          {/* Not under a list that's about to be replaced. */}
          {hasNextPage && !isPlaceholderData && (
            <Button
              type="button"
              variant="secondary"
              onClick={showMore}
              aria-disabled={isFetchingNextPage}
              className="mt-6"
            >
              {isFetchingNextPage ? "Loading…" : "Show more"}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// 2 columns on a phone, 3 at 768, 4 at 1024 (beside the Filters panel), 5 from 1280 (design §14).
const gridClasses =
  "mt-4 grid grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

// "3 recipes match". A page with more after it says so rather than count them all; a search
// answers only its best 50 (design §7), so a full one says that.
function matches(count: number, more: boolean, searching: boolean) {
  if (count === 0) return "No recipes match.";
  if (more) return `More than ${String(count)} recipes match.`;
  if (searching && count === PAGE_SIZE) return `The ${String(PAGE_SIZE)} best matches.`;
  return count === 1 ? "1 recipe matches." : `${String(count)} recipes match.`;
}
