import type { Recipe } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { recipeListQuery } from "./recipeQueries.ts";

export function RecipeListPage() {
  const { status, data, refetch, isFetching } = useQuery(recipeListQuery);

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

      {status === "error" && (
        <div role="alert" className="mt-6">
          <p>We couldn't load your recipes.</p>
          {/* The status stays "error" while it retries, so the button shows the wait. */}
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-3 min-h-11 rounded-lg border border-border px-4 font-semibold hover:bg-border/40 active:bg-border/60 disabled:opacity-60"
          >
            {isFetching ? "Trying…" : "Try again"}
          </button>
        </div>
      )}

      {status === "success" && data.items.length === 0 && (
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

      {status === "success" && data.items.length > 0 && (
        <ul className="mt-6 grid gap-3">
          {data.items.map((recipe) => (
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
