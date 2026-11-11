import { RecipeSchema, type RecipeInput } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router";
import { Breadcrumb } from "../../components/ui/Breadcrumb.tsx";
import { sendJson } from "../../lib/api.ts";
import { toastSaved } from "../../lib/toasts.tsx";
import { focusHeading } from "../../lib/useHeadingFocus.ts";
import { LazyRecipeForm } from "./LazyRecipeForm.tsx";
import { emptyRecipe } from "./recipeFormValues.ts";
import { recipeQuery, refetchRecipeLists } from "./recipeQueries.ts";

export function NewRecipePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const creation = useMutation({
    mutationFn: (input: RecipeInput) => sendJson("POST", "/api/recipes", input, RecipeSchema),
    onSuccess: (recipe) => {
      // The answer is the saved recipe: cached, its page shows at once, without a spinner.
      queryClient.setQueryData(recipeQuery(recipe.id).queryKey, recipe);
      // The lists aren't on screen, so they're refetched now ("all"; every filter and every page
      // loaded so far), ready for when they are. Not awaited, unlike delete: this goes to the
      // new recipe, not to the list.
      void refetchRecipeLists(queryClient);
      // replace: Back from the new recipe goes where the user was, not to a blank form.
      void navigate(`/recipes/${recipe.id}`, { replace: true, state: focusHeading });
      toastSaved(recipe.title);
    },
  });

  return (
    <>
      <title>Write a recipe · Pinch</title>
      {/* Under Add recipe, as a draft is (design §14): the breadcrumbs name the page, so its
          heading is for screen readers. */}
      <Breadcrumb links={[{ label: "Add recipe", to: "/" }]} page="Write a recipe" />
      <h1 className="sr-only">Write a recipe</h1>
      {/* The faster way, for a recipe that's already written down somewhere. Above the form,
          not its intro: it's the page's largest text, and inside the form it waited for the
          form's chunk to paint (LCP 2.6 s, docs/metrics/m08.md). */}
      <p className="mt-4 rounded-card bg-muted p-3 text-sm text-pretty">
        Got the recipe as text?{" "}
        <Link to="/" className="font-semibold underline underline-offset-4">
          Paste it on Add recipe
        </Link>{" "}
        and Pinch fills this in.
      </p>
      <LazyRecipeForm
        defaultValues={emptyRecipe}
        source={{ type: "manual" }}
        submitLabel="Save recipe"
        leave={{ kind: "cancel", to: "/" }}
        save={creation.mutateAsync}
      />
    </>
  );
}
