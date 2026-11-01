import type { Ingredient, Recipe } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { Button } from "../../components/Button.tsx";
import { DeleteRecipeButton } from "./DeleteRecipeButton.tsx";
import { RecipeLoadError } from "./RecipeLoadError.tsx";
import { recipeQuery } from "./recipeQueries.ts";

export function RecipePage() {
  // The route is "recipes/:id", so the id is always there.
  const { id = "" } = useParams();
  const { status, data: recipe, error, refetch, isFetching } = useQuery(recipeQuery(id));

  if (status === "pending") return <p className="text-text-muted">Loading the recipe…</p>;

  if (status === "error") {
    return <RecipeLoadError error={error} retry={() => void refetch()} retrying={isFetching} />;
  }

  const recipeDetails = details(recipe);
  return (
    <article>
      <title>{`${recipe.title} · Pinch`}</title>
      <h1 className="text-3xl font-bold tracking-tight text-balance">{recipe.title}</h1>
      {recipe.description && <p className="mt-3 text-pretty">{recipe.description}</p>}
      {recipeDetails && <p className="mt-3 text-sm text-text-muted">{recipeDetails}</p>}

      <div className="mt-4 flex gap-3">
        <Button asChild variant="secondary">
          <Link to={`/recipes/${recipe.id}/edit`}>Edit</Link>
        </Button>
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
            {ingredientLine(ingredient)}
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
