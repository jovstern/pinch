import { RecipeSchema, type RecipeInput } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { sendJson } from "../../lib/api.ts";
import { toastSaved } from "../../lib/toasts.tsx";
import { LazyRecipeForm } from "./LazyRecipeForm.tsx";
import { emptyRecipe } from "./recipeFormValues.ts";
import { recipeListsKey, recipeQuery } from "./recipeQueries.ts";

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
      void queryClient.invalidateQueries({
        queryKey: recipeListsKey,
        refetchType: "all",
      });
      // replace: Back from the new recipe goes where the user was, not to a blank form.
      void navigate(`/recipes/${recipe.id}`, { replace: true });
      toastSaved(recipe.title);
    },
  });

  return (
    <>
      <title>New recipe · Pinch</title>
      <h1 className="text-3xl font-bold tracking-tight text-balance">New recipe</h1>
      <p className="mt-3 text-sm text-text-muted">
        A title, the ingredients and the steps are all a recipe needs.
      </p>
      <LazyRecipeForm
        defaultValues={emptyRecipe}
        submitLabel="Save recipe"
        cancelTo="/"
        save={creation.mutateAsync}
      />
    </>
  );
}
