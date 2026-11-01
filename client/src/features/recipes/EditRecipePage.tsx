import { RecipeSchema, type RecipeInput } from "@pinch/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { sendJson } from "../../lib/api.ts";
import { LazyRecipeForm } from "./LazyRecipeForm.tsx";
import { toFormValues } from "./recipeFormValues.ts";
import { RecipeLoadError } from "./RecipeLoadError.tsx";
import { recipeListQuery, recipeQuery } from "./recipeQueries.ts";

export function EditRecipePage() {
  // The route is "recipes/:id/edit", so the id is always there.
  const { id = "" } = useParams();
  const {
    status,
    isLoadingError,
    data: recipe,
    error,
    refetch,
    isFetching,
  } = useQuery(recipeQuery(id));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // PUT sends the whole recipe: the form always has every field (design §8, D20).
  const update = useMutation({
    mutationFn: (input: RecipeInput) => sendJson("PUT", `/api/recipes/${id}`, input, RecipeSchema),
    onSuccess: (saved) => {
      // As for a new recipe (NewRecipePage): the answer is cached, the list refetched.
      queryClient.setQueryData(recipeQuery(id).queryKey, saved);
      void queryClient.invalidateQueries({
        queryKey: recipeListQuery.queryKey,
        exact: true,
        refetchType: "all",
      });
      // replace: Back never returns to the form; it goes to the recipe page Edit was opened from.
      void navigate(`/recipes/${id}`, { replace: true });
    },
  });

  if (status === "pending") return <p className="text-text-muted">Loading the recipe…</p>;
  // Only a first load that failed: a failed refetch (on window focus, say) keeps the recipe on
  // screen, and what the user typed in the form.
  if (isLoadingError) {
    return <RecipeLoadError error={error} retry={() => void refetch()} retrying={isFetching} />;
  }

  return (
    <>
      <title>{`Edit ${recipe.title} · Pinch`}</title>
      <h1 className="text-3xl font-bold tracking-tight text-balance">Edit recipe</h1>
      <LazyRecipeForm
        defaultValues={toFormValues(recipe)}
        submitLabel="Save changes"
        cancelTo={`/recipes/${id}`}
        save={update.mutateAsync}
      />
    </>
  );
}
