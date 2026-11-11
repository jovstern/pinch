import { RecipeSchema, type RecipeInput } from "@pinch/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { Breadcrumb } from "../../components/ui/Breadcrumb.tsx";
import { Thumbnail } from "../../components/Thumbnail.tsx";
import { sendJson } from "../../lib/api.ts";
import { toastChangesSaved } from "../../lib/toasts.tsx";
import { focusHeading } from "../../lib/useHeadingFocus.ts";
import { LazyRecipeForm, usePreloadRecipeForm } from "./LazyRecipeForm.tsx";
import { toFormValues } from "./recipeFormValues.ts";
import { RecipeLoadError } from "./RecipeLoadError.tsx";
import { recipeQuery, refetchRecipeLists } from "./recipeQueries.ts";

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
  usePreloadRecipeForm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  // PUT sends the whole recipe: the form always has every field (design §8, D20).
  const update = useMutation({
    mutationFn: (input: RecipeInput) => sendJson("PUT", `/api/recipes/${id}`, input, RecipeSchema),
    onSuccess: (saved) => {
      // As for a new recipe (NewRecipePage): the answer is cached, the list refetched.
      queryClient.setQueryData(recipeQuery(id).queryKey, saved);
      void refetchRecipeLists(queryClient);
      // replace: Back never returns to the form; it goes to the recipe page Edit was opened from.
      void navigate(`/recipes/${id}`, { replace: true, state: focusHeading });
      toastChangesSaved();
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
      <Breadcrumb
        links={[
          { label: "My recipes", to: "/recipes" },
          { label: recipe.title, to: `/recipes/${id}` },
        ]}
        page="Edit"
      />
      {/* The breadcrumbs name the page, so its heading is for screen readers. */}
      <h1 className="sr-only">{`Edit ${recipe.title}`}</h1>
      <LazyRecipeForm
        defaultValues={toFormValues(recipe)}
        source={recipe.source}
        picture={
          recipe.thumbnail && (
            <Thumbnail src={`/api/recipes/${id}/thumbnail`} size={recipe.thumbnail} shape="full" />
          )
        }
        submitLabel="Save changes"
        leave={{ kind: "cancel", to: `/recipes/${id}` }}
        save={update.mutateAsync}
      />
    </>
  );
}
