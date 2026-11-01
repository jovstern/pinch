import type { Ingredient, Recipe } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { NotFoundPage } from "../../components/NotFoundPage.tsx";
import { ApiError } from "../../lib/api.ts";
import { DeleteRecipeButton } from "./DeleteRecipeButton.tsx";
import { recipeQuery } from "./recipeQueries.ts";

export function RecipePage() {
  // The route is "recipes/:id", so the id is always there.
  const { id = "" } = useParams();
  const { status, data: recipe, error, refetch, isFetching } = useQuery(recipeQuery(id));

  if (status === "pending") return <p className="text-text-muted">Loading the recipe…</p>;

  if (status === "error") {
    if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
    return (
      <div role="alert">
        <p>We couldn't load this recipe.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="mt-3 min-h-11 rounded-lg border border-border px-4 font-semibold hover:bg-border/40 active:bg-border/60 disabled:opacity-60"
        >
          {isFetching ? "Trying…" : "Try again"}
        </button>
      </div>
    );
  }

  const recipeDetails = details(recipe);
  return (
    <article>
      <title>{`${recipe.title} · Pinch`}</title>
      <h1 className="text-3xl font-bold tracking-tight text-balance">{recipe.title}</h1>
      {recipe.description && <p className="mt-3 text-pretty">{recipe.description}</p>}
      {recipeDetails && <p className="mt-3 text-sm text-text-muted">{recipeDetails}</p>}

      <div className="mt-4 flex gap-3">
        <Link
          to={`/recipes/${recipe.id}/edit`}
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 font-semibold hover:bg-border/40 active:bg-border/60"
        >
          Edit
        </Link>
        <DeleteRecipeButton recipe={recipe} />
      </div>

      {/* Each list is named by its heading, for screen readers (and the tests). */}
      <h2 id="ingredients" className="mt-8 text-xl font-semibold">
        Ingredients
      </h2>
      <ul aria-labelledby="ingredients" className="mt-3 grid gap-2">
        {recipe.ingredients.map((ingredient, index) => (
          // Ingredients have no id; their order is their identity within the recipe.
          <li key={index}>
            {amount(ingredient)} {ingredient.name}
            {ingredient.note && <span className="text-text-muted">, {ingredient.note}</span>}
          </li>
        ))}
      </ul>

      <h2 id="steps" className="mt-8 text-xl font-semibold">
        Steps
      </h2>
      <ol aria-labelledby="steps" className="mt-3 grid list-decimal gap-3 pl-6">
        {recipe.steps.map((step, index) => (
          <li key={index} className="pl-1 text-pretty">
            {step}
          </li>
        ))}
      </ol>
    </article>
  );
}

// "Serves 4 · Prep 10 min · Cook 20 min", leaving out what the recipe doesn't say.
function details(recipe: Recipe) {
  const parts = [
    recipe.servings && `Serves ${String(recipe.servings)}`,
    recipe.prepMinutes && `Prep ${String(recipe.prepMinutes)} min`,
    recipe.cookMinutes && `Cook ${String(recipe.cookMinutes)} min`,
  ];
  return parts.filter(Boolean).join(" · ");
}

// "2 tbsp", "2" or "" before the ingredient's name.
function amount(ingredient: Ingredient) {
  return [ingredient.quantity, ingredient.unit].filter(Boolean).join(" ");
}
