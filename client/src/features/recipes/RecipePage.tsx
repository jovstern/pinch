import type { Ingredient, Recipe } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { Link, useParams } from "react-router";
import { Button } from "../../components/Button.tsx";
import { RecipeLoadError } from "./RecipeLoadError.tsx";
import { recipeQuery } from "./recipeQueries.ts";

// Delete's dialog (Radix, ~14 kB) loads with the page but apart from it, so it isn't in every
// screen's first load (docs/metrics/m02.md). Edit shows first; Delete appears beside it.
const DeleteRecipeButton = lazy(async () => ({
  default: (await import("./DeleteRecipeButton.tsx")).DeleteRecipeButton,
}));

export function RecipePage() {
  // The route is "recipes/:id", so the id is always there.
  const { id = "" } = useParams();
  const {
    status,
    isLoadingError,
    data: recipe,
    error,
    refetch,
    isFetching,
  } = useQuery(recipeQuery(id));

  if (status === "pending") return <p className="text-text-muted">Loading the recipe…</p>;

  // Only a first load that failed: a failed refetch (on window focus, say) keeps the recipe on
  // screen, and what the user typed in the form.
  if (isLoadingError) {
    return <RecipeLoadError error={error} retry={() => void refetch()} retrying={isFetching} />;
  }

  const recipeDetails = details(recipe);
  return (
    <article>
      <title>{`${recipe.title} · Pinch`}</title>
      <h1 className="text-3xl font-bold tracking-tight text-balance">{recipe.title}</h1>
      {recipe.description && <p className="mt-3 max-w-prose text-pretty">{recipe.description}</p>}
      {recipeDetails && <p className="mt-3 text-sm text-text-muted">{recipeDetails}</p>}

      <div className="mt-4 flex gap-3">
        <Button asChild variant="secondary">
          <Link to={`/recipes/${recipe.id}/edit`}>Edit</Link>
        </Button>
        <Suspense>
          <DeleteRecipeButton recipe={recipe} />
        </Suspense>
      </div>

      {/* Each list is named by its heading, for screen readers (and the tests). */}
      <h2 id="ingredients" className="mt-8 text-xl font-semibold">
        Ingredients
      </h2>
      <ul aria-labelledby="ingredients" className="mt-3 grid gap-2">
        {recipe.ingredients.map((ingredient, index) => (
          // Ingredients have no id; their order is their identity within the recipe.
          <li key={index}>
            {ingredientLine(ingredient)}
            {ingredient.note && <span className="text-text-muted">, {ingredient.note}</span>}
          </li>
        ))}
      </ul>

      <h2 id="steps" className="mt-8 text-xl font-semibold">
        Steps
      </h2>
      <ol aria-labelledby="steps" className="mt-3 grid max-w-prose list-decimal gap-3 pl-6">
        {recipe.steps.map((step, index) => (
          <li key={index} className="pl-1 text-pretty">
            {step}
          </li>
        ))}
      </ol>
    </article>
  );
}

// "Serves 4 · Prep 10 min · Cook 25 min", leaving out what the recipe doesn't say.
function details(recipe: Recipe) {
  const parts: string[] = [];
  if (recipe.servings) parts.push(`Serves ${String(recipe.servings)}`);
  if (recipe.prepMinutes) parts.push(`Prep ${String(recipe.prepMinutes)} min`);
  if (recipe.cookMinutes) parts.push(`Cook ${String(recipe.cookMinutes)} min`);
  return parts.join(" · ");
}

// "2 tbsp olive oil", or just "salt" when the recipe gives no amount.
function ingredientLine(ingredient: Ingredient) {
  return [ingredient.quantity, ingredient.unit, ingredient.name].filter(Boolean).join(" ");
}
