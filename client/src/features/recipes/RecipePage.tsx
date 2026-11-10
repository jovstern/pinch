import type { Nutrition, Recipe } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { Badge } from "../../components/ui/Badge.tsx";
import { Breadcrumb } from "../../components/ui/Breadcrumb.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Thumbnail } from "../../components/Thumbnail.tsx";
import { useHeadingFocus } from "../../lib/useHeadingFocus.ts";
import { ingredientLine } from "./ingredientLine.ts";
import { keepRangesTogether } from "./ranges.ts";
import { LazyRecipeMenu } from "./LazyRecipeMenu.tsx";
import { RecipeLoadError } from "./RecipeLoadError.tsx";
import { RecipeSkeleton } from "./RecipeSkeleton.tsx";
import { RecipeSource } from "./RecipeSource.tsx";
import { filterParams, noFilters, recipeQuery } from "./recipeQueries.ts";
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
  const headingRef = useHeadingFocus();

  if (status === "pending") return <RecipeSkeleton />;

  // Only a first load that failed: a failed refetch (on window focus, say) keeps the recipe on
  // screen, and what the user typed in the form.
  if (isLoadingError) {
    return <RecipeLoadError error={error} retry={() => void refetch()} retrying={isFetching} />;
  }

  const recipeDetails = details(recipe);
  return (
    <article>
      <title>{`${recipe.title} · Pinch`}</title>
      <Breadcrumb links={[{ label: "My recipes", to: "/recipes" }]} page={recipe.title} />
      {/* The picture above the title on a phone, beside it from 1024 px (design §14). */}
      <div className="mt-2 lg:flex lg:items-start lg:gap-12">
        {recipe.thumbnail && (
          <Thumbnail
            src={`/api/recipes/${recipe.id}/thumbnail`}
            size={recipe.thumbnail}
            shape="banner"
          />
        )}
        <div className="mt-4 min-w-0 lg:mt-0">
          <h1
            ref={headingRef}
            tabIndex={-1}
            dir="auto"
            className="text-3xl font-bold tracking-tight text-balance"
          >
            {recipe.title}
          </h1>
          {/* One block, so the nutrition sits close under the source and details. */}
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
            <p>
              <RecipeSource source={recipe.source} />
              {recipeDetails && ` · ${recipeDetails}`}
            </p>
            {recipe.nutritionPerServing && (
              // Kept together, so a phone wraps between the amounts, not inside "per serving".
              <p className="tabular-nums">
                {nutritionLine(recipe.nutritionPerServing)}{" "}
                <span className="whitespace-nowrap">per serving (estimate)</span>
              </p>
            )}
          </div>
          {recipe.description && (
            <p dir="auto" className="mt-3 max-w-prose text-pretty">
              {recipe.description}
            </p>
          )}
          {recipe.tags.length > 0 && (
            // No heading above it, so it's named here (screen readers, tests). Each tag opens My
            // recipes filtered by it; 32 px tall, with a 44 px touch area (the after:, and
            // min-w-11 for a short tag), which the rows' gap leaves room for.
            <ul aria-label="Tags" className="mt-3 flex flex-wrap gap-x-2 gap-y-3">
              {recipe.tags.map((tag) => (
                <li key={tag}>
                  <Badge
                    asChild
                    variant="secondary"
                    className="relative h-8 min-w-11 after:absolute after:inset-x-0 after:-inset-y-1.5 hover:bg-border active:bg-border/70"
                  >
                    <Link to={`/recipes?${filterParams({ ...noFilters, tags: [tag] }).toString()}`}>
                      {tagLabel(tag)}
                    </Link>
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {/* Cook is the page's one main action (docs/ux/plan.md U2); the rest is under ⋯. */}
          <div className="mt-5 flex gap-2">
            <Button asChild className="flex-1 sm:w-48 sm:flex-none">
              <Link to={`/recipes/${recipe.id}/cook`}>Cook</Link>
            </Button>
            <LazyRecipeMenu recipe={recipe} />
          </div>
        </div>
      </div>

      {/* From 1024 px the ingredients sit in a panel beside the steps, so the whole recipe fits
          without scrolling back (design §14). */}
      <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <section className="lg:rounded-card lg:border lg:border-border lg:p-5">
          {/* Each list is named by its heading, for screen readers (and the tests). */}
          <h2 id="ingredients" className="text-xl font-semibold">
            Ingredients
          </h2>
          <ul aria-labelledby="ingredients" dir="auto" className="mt-3 grid gap-2">
            {recipe.ingredients.map((ingredient, index) => (
              // Ingredients have no id; their order is their identity within the recipe.
              <li key={index}>
                {ingredientLine(ingredient)}
                {ingredient.note && (
                  <span className="text-muted-foreground">, {ingredient.note}</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 lg:mt-0">
          <h2 id="steps" className="text-xl font-semibold">
            Steps
          </h2>
          {/* dir="auto" on the list (a recipe's steps are in one language): a Hebrew recipe's
              numbers sit on the right, with room for them (ps: padding on the side the text
              starts). */}
          <ol
            aria-labelledby="steps"
            dir="auto"
            className="mt-3 grid max-w-prose list-decimal gap-3 ps-6 rtl:ml-auto"
          >
            {recipe.steps.map((step, index) => (
              <li key={index} className="ps-1 text-pretty">
                {keepRangesTogether(step)}
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* A placeholder (design §1). When built: its own collection, never an array in the
          recipe, as comments grow without limit. */}
      <h2 className="mt-8 text-xl font-semibold">Comments</h2>
      <p className="mt-3 text-muted-foreground">
        Coming soon: notes from whoever you share this recipe with.
      </p>
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
