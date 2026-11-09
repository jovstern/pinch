import { RecipeSchema, type Import, type Recipe, type RecipeInput } from "@pinch/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { Breadcrumb } from "../../components/ui/Breadcrumb.tsx";
import { Thumbnail } from "../../components/Thumbnail.tsx";
import { deleteResource, sendJson } from "../../lib/api.ts";
import { toastCouldntSave, toastDiscarded, toastSaved } from "../../lib/toasts.tsx";
import { LazyRecipeForm, usePreloadRecipeForm } from "../recipes/LazyRecipeForm.tsx";
import { toFormValues } from "../recipes/recipeFormValues.ts";
import { RecipeLoadError } from "../recipes/RecipeLoadError.tsx";
import { recipeListsKey, recipeQuery } from "../recipes/recipeQueries.ts";
import { DraftBanner } from "./DraftBanner.tsx";
import { importListQuery, importQuery } from "./importQueries.ts";

// The draft the worker made, in the recipe form: nothing is saved until the user has checked it
// and pressed Save (design D1). Save approves it (§4.4), Discard deletes it.
export function ReviewImportPage() {
  // The route is "imports/:id", so the id is always there.
  const { id = "" } = useParams();
  const {
    status,
    isLoadingError,
    data: job,
    error,
    refetch,
    isFetching,
  } = useQuery(importQuery(id));
  usePreloadRecipeForm();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const approval = useMutation({
    mutationFn: (input: RecipeInput) =>
      sendJson("POST", `/api/imports/${id}/approve`, input, RecipeSchema),
    onSuccess: (recipe) => {
      // As for a new recipe (NewRecipePage); and the import is gone from the list. Only the
      // list: this import would now answer 404 (as DeleteRecipeDialog).
      queryClient.setQueryData(recipeQuery(recipe.id).queryKey, recipe);
      void queryClient.invalidateQueries({ queryKey: recipeListsKey, refetchType: "all" });
      void queryClient.invalidateQueries({
        queryKey: importListQuery.queryKey,
        refetchType: "all",
      });
      // replace: Back from the recipe goes to the list, not to a draft that no longer exists.
      void navigate(`/recipes/${recipe.id}`, { replace: true });
      toastSaved(recipe.title);
    },
  });
  // Asked first (LeaveDialog, in the form); a failure toasts with Try again (design §14).
  const discard = useMutation({
    mutationFn: () => deleteResource(`/api/imports/${id}`),
    onSuccess: async () => {
      // As deleting a recipe: the list is fresh before it shows, so the draft never flashes there.
      await queryClient.invalidateQueries({
        queryKey: importListQuery.queryKey,
        refetchType: "all",
      });
      void navigate("/", { replace: true });
      toastDiscarded(job?.draft?.title);
    },
    onError: () => {
      toastCouldntSave(() => {
        discard.mutate();
      });
    },
  });

  if (status === "pending") return <p className="text-text-muted">Loading the recipe…</p>;
  if (isLoadingError) {
    return <RecipeLoadError error={error} retry={() => void refetch()} retrying={isFetching} />;
  }
  // An address typed or kept from before, of an import not done yet or failed. A draft is there
  // exactly when the import is ready, and checking it tells TypeScript it's there.
  if (job.draft === undefined) {
    return (
      <>
        <title>Not ready · Pinch</title>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Not ready to review</h1>
        <p className="mt-3 text-pretty text-text-muted">This import has no recipe to review.</p>
        <Link to="/" className="mt-3 inline-block font-semibold text-accent-strong underline">
          Back to New recipe
        </Link>
      </>
    );
  }

  return (
    <>
      <title>{`Review ${job.draft.title} · Pinch`}</title>
      <Breadcrumb links={[{ label: "New recipe", to: "/" }]} page={`Review: ${job.draft.title}`} />
      {/* The breadcrumbs name the page, so its heading is for screen readers. */}
      <h1 className="sr-only">{`Review ${job.draft.title}`}</h1>
      <DraftBanner input={job.input} />
      <LazyRecipeForm
        defaultValues={toFormValues(job.draft)}
        source={sourceOf(job.input)}
        picture={
          job.thumbnail && (
            <Thumbnail src={`/api/imports/${job.id}/thumbnail`} size={job.thumbnail} shape="full" />
          )
        }
        submitLabel="Save to My recipes"
        leave={{
          kind: "discard",
          title: job.draft.title,
          // Not while saving: one or the other would find the import gone.
          discard: () => {
            if (!discard.isPending && !approval.isPending) discard.mutate();
          },
          discarding: discard.isPending,
        }}
        save={approval.mutateAsync}
      />
    </>
  );
}

// The recipe's source once it's saved: approve sets it from the import the same way (the API).
function sourceOf(input: Import["input"]): Recipe["source"] {
  if (input.type === "link") return { type: input.platform, url: input.url };
  if (input.type === "text") return { type: "text" };
  return { type: "image" };
}
