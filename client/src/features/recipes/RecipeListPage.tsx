import { isTag, type Recipe } from "@pinch/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { Button } from "../../components/Button.tsx";
import { ListFilters } from "./ListFilters.tsx";
import { filterParams, recipeListQuery, type RecipeFilters } from "./recipeQueries.ts";

export function RecipeListPage() {
  // The filters live in the address, so a reload, Back or a shared link keeps them (ui-craft).
  // A tag not in the lists (a hand-edited link) is left out rather than sent: it's a 400.
  const [searchParams, setSearchParams] = useSearchParams();
  const filters: RecipeFilters = {
    q: searchParams.get("q") ?? "",
    tags: searchParams.get("tags")?.split(",").filter(isTag) ?? [],
  };
  const filtering = filters.q !== "" || filters.tags.length > 0;

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
  } = useInfiniteQuery(recipeListQuery(filters));
  const listRef = useRef<HTMLUListElement>(null);
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
    // replace: each tick or search changes the address in place; Back leaves the list rather
    // than undoing filters one by one.
    setSearchParams(filterParams(next), { replace: true });
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

  return (
    <>
      <title>Your recipes · Pinch</title>
      <h1 className="text-3xl font-bold tracking-tight text-balance">Your recipes</h1>

      {/* Not before the first recipe: there's nothing to search yet. */}
      {(filtering || recipes?.length !== 0) && (
        <>
          <ListFilters filters={filters} onChange={changeFilters} />
          {/* Announced as results arrive (ui-craft: aria-live for async results). */}
          <p role="status" className="mt-3 text-sm text-text-muted">
            {filtering && recipes !== undefined && matches(recipes.length, hasNextPage)}
          </p>
        </>
      )}

      {status === "pending" && (
        <>
          <p className="sr-only">Loading your recipes…</p>
          {/* Placeholders the size of the cards, so nothing jumps when they arrive. */}
          <ul aria-hidden="true" className="mt-6 grid gap-3">
            {[1, 2, 3].map((n) => (
              <li key={n} className="h-20 rounded-xl bg-border/60 motion-safe:animate-pulse" />
            ))}
          </ul>
        </>
      )}

      {/* Only when nothing has loaded: a failed refetch or next page keeps the list on screen. */}
      {isLoadingError && (
        <div role="alert" className="mt-6">
          <p>We couldn't load your recipes.</p>
          {/* The status stays "error" while it retries, so the button shows the wait. */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3"
          >
            {isFetching ? "Trying…" : "Try again"}
          </Button>
        </div>
      )}

      {/* By the data, not the status: a failed next page or refetch turns the status to "error"
          and keeps the list. */}
      {filtering && recipes?.length === 0 && (
        <Link to="/" className="mt-3 inline-block font-semibold text-accent-strong underline">
          Clear the search and filters
        </Link>
      )}

      {!filtering && recipes?.length === 0 && (
        <div className="mt-6">
          <p className="text-pretty text-text-muted">
            No recipes yet. Add one you love and it will live here.
          </p>
          <Link
            to="/recipes/new"
            className="mt-3 inline-block font-semibold text-accent-strong underline"
          >
            Add your first recipe
          </Link>
        </div>
      )}

      {recipes !== undefined && recipes.length > 0 && (
        <ul ref={listRef} className="mt-6 grid gap-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                to={`/recipes/${recipe.id}`}
                className="block rounded-xl border border-border bg-surface-raised p-4 hover:border-accent"
              >
                <h2 className="text-lg font-semibold">{recipe.title}</h2>
                <p className="mt-1 text-sm text-text-muted">{summary(recipe)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isFetchNextPageError && (
        <p role="alert" className="mt-6 text-danger">
          We couldn't load more recipes. Press Show more to try again.
        </p>
      )}
      {hasNextPage && (
        <Button type="button" variant="secondary" onClick={showMore} className="mt-6">
          {isFetchingNextPage ? "Loading…" : "Show more"}
        </Button>
      )}
    </>
  );
}

// "3 recipes match": a page with more after it says so rather than count them all.
function matches(count: number, more: boolean) {
  if (count === 0) return "No recipes match.";
  if (more) return `More than ${String(count)} recipes match.`;
  return count === 1 ? "1 recipe matches." : `${String(count)} recipes match.`;
}

// "6 ingredients · 25 min": the two things that decide what to cook tonight.
function summary(recipe: Recipe) {
  const minutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const count = recipe.ingredients.length;
  const ingredients = count === 1 ? "1 ingredient" : `${String(count)} ingredients`;
  return minutes > 0 ? `${ingredients} · ${String(minutes)} min` : ingredients;
}
