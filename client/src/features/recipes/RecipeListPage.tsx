import type { Recipe } from "@pinch/shared";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { Button } from "../../components/Button.tsx";
import { recipeListQuery } from "./recipeQueries.ts";

export function RecipeListPage() {
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
  } = useInfiniteQuery(recipeListQuery);
  const listRef = useRef<HTMLUListElement>(null);
  // The first recipe of the page Show more asked for, to focus once it's drawn.
  const firstNewRef = useRef<number | null>(null);
  const recipes = data?.pages.flatMap((page) => page.items);

  // ui-craft: focus goes to the first new recipe, so the keyboard carries on from there rather
  // than from the button below the new ones. In an effect, because the page arrives (and
  // fetchNextPage resolves) before React draws it.
  useEffect(() => {
    if (firstNewRef.current === null) return;
    const link = listRef.current?.querySelectorAll("a")[firstNewRef.current];
    if (!link) return;
    link.focus();
    firstNewRef.current = null;
  });

  function showMore() {
    firstNewRef.current = recipes?.length ?? 0;
    void fetchNextPage();
  }

  return (
    <>
      <title>Your recipes · Pinch</title>
      <h1 className="text-3xl font-bold tracking-tight text-balance">Your recipes</h1>

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

      {recipes?.length === 0 && (
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
        <p role="alert" className="mt-6">
          We couldn't load more recipes. Try again.
        </p>
      )}
      {hasNextPage && (
        <Button
          type="button"
          variant="secondary"
          onClick={showMore}
          disabled={isFetchingNextPage}
          className="mt-6"
        >
          {isFetchingNextPage ? "Loading…" : "Show more"}
        </Button>
      )}
    </>
  );
}

// "6 ingredients · 25 min": the two things that decide what to cook tonight.
function summary(recipe: Recipe) {
  const minutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const count = recipe.ingredients.length;
  const ingredients = count === 1 ? "1 ingredient" : `${String(count)} ingredients`;
  return minutes > 0 ? `${ingredients} · ${String(minutes)} min` : ingredients;
}
