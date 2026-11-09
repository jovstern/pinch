import type { Nutrition, Recipe } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { Button } from "../../components/Button.tsx";
import { Thumbnail } from "../../components/Thumbnail.tsx";
import { ingredientLine } from "./ingredientLine.ts";
import { DeleteRecipeButton } from "./DeleteRecipeButton.tsx";
import { RecipeLoadError } from "./RecipeLoadError.tsx";
import { recipeQuery } from "./recipeQueries.ts";
import { tagLabel } from "./tagLabels.ts";

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
      {/* At the top, at its own shape. */}
      {recipe.thumbnail && (
        <Thumbnail
          src={`/api/recipes/${recipe.id}/thumbnail`}
          size={recipe.thumbnail}
          shape="full"
          className="mb-4"
        />
      )}
      <h1 dir="auto" className="text-3xl font-bold tracking-tight text-balance">
        {recipe.title}
      </h1>
      {recipe.description && <p className="mt-3 max-w-prose text-pretty">{recipe.description}</p>}
      {/* One block, so the nutrition sits close under the details, or alone in their place. */}
      {(recipeDetails || recipe.nutritionPerServing) && (
        <div className="mt-3 grid gap-1 text-sm text-text-muted">
          {recipeDetails && <p>{recipeDetails}</p>}
          {recipe.nutritionPerServing && (
            // Kept together, so a phone wraps between the amounts, not inside "per serving".
            <p className="tabular-nums">
              {nutritionLine(recipe.nutritionPerServing)}{" "}
              <span className="whitespace-nowrap">per serving (estimate)</span>
            </p>
          )}
        </div>
      )}
      {recipe.tags.length > 0 && (
        // No heading above it, so it's named here (screen readers, tests).
        <ul aria-label="Tags" className="mt-3 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-fill px-3 py-1 text-sm">
              {tagLabel(tag)}
            </li>
          ))}
        </ul>
      )}

      {/* Cook is the page's one main action (docs/ux/plan.md U2). */}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button asChild variant="primary">
          <Link to={`/recipes/${recipe.id}/cook`}>Cook</Link>
        </Button>
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

// "≈ 520 kcal · 18 g protein · 92 g carbs · 8 g fat", per serving: Gemini's guess from
// the ingredients (design D14), so said to be one, and rounded: a decimal would look exact.
function nutritionLine({ calories, proteinG, carbsG, fatG }: Nutrition) {
  const round = (amount: number) => String(Math.round(amount));
  const amounts = [
    `≈ ${round(calories)} kcal`,
    `${round(proteinG)} g protein`,
    `${round(carbsG)} g carbs`,
    `${round(fatG)} g fat`,
  ];
  return amounts.join(" · ");
}
