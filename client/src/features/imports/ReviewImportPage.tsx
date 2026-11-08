import { RecipeSchema, type RecipeInput } from "@pinch/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "../../components/Button.tsx";
import { deleteResource, sendJson } from "../../lib/api.ts";
import { LazyRecipeForm } from "../recipes/LazyRecipeForm.tsx";
import { toFormValues } from "../recipes/recipeFormValues.ts";
import { RecipeLoadError } from "../recipes/RecipeLoadError.tsx";
import { recipeListsKey, recipeQuery } from "../recipes/recipeQueries.ts";
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
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const approval = useMutation({
    mutationFn: (input: RecipeInput) =>
      sendJson("POST", `/api/imports/${id}/approve`, input, RecipeSchema),
    onSuccess: (recipe) => {
      // As for a new recipe (NewRecipePage); and the import is gone from the list. Only the
      // list: this import would now answer 404 (as DeleteRecipeButton).
      queryClient.setQueryData(recipeQuery(recipe.id).queryKey, recipe);
      void queryClient.invalidateQueries({ queryKey: recipeListsKey, refetchType: "all" });
      void queryClient.invalidateQueries({
        queryKey: importListQuery.queryKey,
        refetchType: "all",
      });
      // replace: Back from the recipe goes to the list, not to a draft that no longer exists.
      void navigate(`/recipes/${recipe.id}`, { replace: true });
    },
  });
  // No question first, unlike deleting a recipe: pasting the link again makes the draft again.
  const discard = useMutation({
    mutationFn: () => deleteResource(`/api/imports/${id}`),
    onSuccess: async () => {
      // As deleting a recipe: the list is fresh before it shows, so the draft never flashes there.
      await queryClient.invalidateQueries({
        queryKey: importListQuery.queryKey,
        refetchType: "all",
      });
      void navigate("/", { replace: true });
    },
  });

  if (status === "pending") return <p className="text-text-muted">Loading the recipe…</p>;
  if (isLoadingError) {
    return <RecipeLoadError error={error} retry={() => void refetch()} retrying={isFetching} />;
  }
  // An address typed or kept from before, of a link not done yet or failed. A draft is there
  // exactly when the import is ready, and checking it tells TypeScript it's there.
  if (job.draft === undefined) {
    return (
      <>
        <title>Not ready · Pinch</title>
        <h1 className="text-3xl font-bold tracking-tight text-balance">Not ready to review</h1>
        <p className="mt-3 text-pretty text-text-muted">This link has no recipe to review.</p>
        <Link to="/" className="mt-3 inline-block font-semibold text-accent-strong underline">
          Back to your recipes
        </Link>
      </>
    );
  }

  return (
    <>
      <title>{`Review ${job.draft.title} · Pinch`}</title>
      <h1 className="text-3xl font-bold tracking-tight text-balance">Review the recipe</h1>
      <p className="mt-3 text-sm text-pretty text-text-muted">
        Fix anything that's wrong, then save it. Made from
        {job.input.type === "link" ? ":" : " the text you pasted."}
      </p>
      {/* A new tab: going to the post here would lose what was typed. One line, as in the list. */}
      {job.input.type === "link" && (
        <a
          href={job.input.url}
          target="_blank"
          rel="noreferrer"
          title={job.input.url}
          className="block truncate text-sm text-text-muted underline"
        >
          {job.input.url}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
      <LazyRecipeForm
        defaultValues={toFormValues(job.draft)}
        submitLabel="Save recipe"
        cancelTo="/"
        cancelLabel="Review later"
        save={approval.mutateAsync}
        extraAction={
          // Discard deletes the draft; Review later leaves it. Last in the row, apart: it's not
          // the way forward. Not while saving (one or the other would find the import gone), and
          // not disabled, so focus stays on it (as Show more).
          <Button
            type="button"
            variant="danger-quiet"
            onClick={() => {
              if (!discard.isPending && !approval.isPending) discard.mutate();
            }}
            aria-disabled={discard.isPending || approval.isPending}
            className="ml-auto"
          >
            {discard.isPending ? "Discarding…" : "Discard"}
          </Button>
        }
      />
      {/* Under the buttons, by Discard; the form's own save error is its own, above them. */}
      {discard.isError && (
        <p role="alert" className="mt-3 text-danger">
          It couldn't be discarded. Try again.
        </p>
      )}
    </>
  );
}
