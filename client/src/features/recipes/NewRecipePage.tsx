import { RecipeSchema, type RecipeInput } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { sendJson } from "../../lib/api.ts";
import { emptyRecipe, RecipeForm } from "./RecipeForm.tsx";
import { recipeListQuery, recipeQuery } from "./recipeQueries.ts";

export function NewRecipePage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const creation = useMutation({
    mutationFn: (input: RecipeInput) => sendJson("POST", "/api/recipes", input, RecipeSchema),
    onSuccess: (recipe) => {
      // The answer is the saved recipe: cached, its page shows at once, without a spinner.
      queryClient.setQueryData(recipeQuery(recipe.id).queryKey, recipe);
      // The list isn't on screen, so it's refetched now ("all"), ready for when it is.
      void queryClient.invalidateQueries({
        queryKey: recipeListQuery.queryKey,
        exact: true,
        refetchType: "all",
      });
      // replace: Back from the new recipe goes where the user was, not to a blank form.
      void navigate(`/recipes/${recipe.id}`, { replace: true });
    },
  });

  return (
    <>
      <title>New recipe · Pinch</title>
      <h1 className="text-3xl font-bold tracking-tight text-balance">New recipe</h1>
      <RecipeForm
        defaultValues={emptyRecipe}
        submitLabel="Save recipe"
        cancelTo="/"
        save={creation.mutateAsync}
      />
    </>
  );
}
