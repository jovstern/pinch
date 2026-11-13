import { RecipeSchema, type Import, type Recipe, type RecipeInput } from "@pinch/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router";
import { Breadcrumb } from "../../components/ui/Breadcrumb.tsx";
import { InSentence } from "../../components/InSentence.tsx";
import { Thumbnail } from "../../components/Thumbnail.tsx";
import { ApiError, deleteResource, sendJson } from "../../lib/api.ts";
import { isolate } from "../../lib/isolate.ts";
import { dismissToast, toastCouldntSave, toastDiscarded, toastSaved } from "../../lib/toasts.tsx";
import { focusHeading } from "../../lib/useHeadingFocus.ts";
import { LazyRecipeForm, usePreloadRecipeForm } from "../recipes/LazyRecipeForm.tsx";
import { toFormValues } from "../recipes/recipeFormValues.ts";
import { RecipeLoadError } from "../recipes/RecipeLoadError.tsx";
import { recipeQuery, refetchRecipeLists } from "../recipes/recipeQueries.ts";
import { DraftBanner } from "./DraftBanner.tsx";
import { importListQuery, importQuery, restoreImport } from "./importQueries.ts";

// The draft the worker made, in the recipe form: nothing is saved until the user has checked it
// and pressed Save (design D1). Save approves it (§4.4), Discard deletes it.
export function ReviewImportPage() {
  const { t } = useTranslation();
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
  // An effect: the toasts live outside React. The draft's "ready to review" toast (its id is the
  // import's) has done its job once the draft is open, and from 768 px it would sit over Save.
  useEffect(() => {
    dismissToast(id);
  }, [id]);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const approval = useMutation({
    mutationFn: (input: RecipeInput) =>
      sendJson("POST", `/api/imports/${id}/approve`, input, RecipeSchema),
    onSuccess: (recipe) => {
      // As for a new recipe (NewRecipePage); and the import is gone from the list. Only the
      // list: this import would now answer 404 (as DeleteRecipeDialog).
      queryClient.setQueryData(recipeQuery(recipe.id).queryKey, recipe);
      void refetchRecipeLists(queryClient);
      void queryClient.invalidateQueries({
        queryKey: importListQuery.queryKey,
        refetchType: "all",
      });
      // replace: Back from the recipe goes to the list, not to a draft that no longer exists.
      void navigate(`/recipes/${recipe.id}`, { replace: true, state: focusHeading });
      toastSaved(recipe.title);
    },
  });
  // The form asks first, and never while saving (LeaveDialog); a failure toasts with Try again
  // (design §14).
  const discard = useMutation({
    mutationFn: () => deleteResource(`/api/imports/${id}`),
    onSuccess: async () => {
      // As deleting a recipe: the list is fresh before it shows, so the draft never flashes there.
      await queryClient.invalidateQueries({
        queryKey: importListQuery.queryKey,
        refetchType: "all",
      });
      void navigate("/", { replace: true, state: focusHeading });
      // Undo puts it back in the queue, on /, where the user now is (D27).
      toastDiscarded(job?.draft?.title, () => restoreImport(queryClient, id));
    },
    onError: () => {
      toastCouldntSave(() => {
        discard.mutate();
      });
    },
  });

  // An address typed or kept from before, of an import gone (404), not done yet, or failed: no
  // draft yet, and the way back is Add recipe, where the queue is (design §14).
  const noDraft = (
    <>
      <title>{`${t("editor.noDraft")} · Pinch`}</title>
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">{t("editor.noDraft")}</h1>
      <p className="mt-3 text-pretty text-text-muted">{t("editor.noDraftWhy")}</p>
      <Link to="/" className="mt-3 inline-block font-semibold text-accent-strong underline">
        {t("editor.backToAdd")}
      </Link>
    </>
  );

  if (status === "pending") return <p className="text-text-muted">{t("recipe.loading")}</p>;
  if (isLoadingError) {
    if (error instanceof ApiError && error.status === 404) return noDraft;
    return <RecipeLoadError error={error} retry={() => void refetch()} retrying={isFetching} />;
  }
  // A draft is there exactly when the import is ready, and checking it tells TypeScript it's there.
  if (job.draft === undefined) return noDraft;

  return (
    <>
      {/* The title in isolates, as a <title> can't hold <bdi> (design §16.3, §16.5). */}
      <title>{`${t("editor.reviewTitle", { title: isolate(job.draft.title) })} · Pinch`}</title>
      <Breadcrumb
        links={[{ label: t("header.addRecipe"), to: "/" }]}
        page={
          <InSentence
            sentence={(title) => t("editor.reviewCrumb", { title })}
            text={job.draft.title}
          />
        }
      />
      {/* The breadcrumbs name the page, so its heading is for screen readers. */}
      <h1 className="sr-only">
        <InSentence
          sentence={(title) => t("editor.reviewTitle", { title })}
          text={job.draft.title}
        />
      </h1>
      <LazyRecipeForm
        intro={<DraftBanner input={job.input} />}
        defaultValues={toFormValues(job.draft)}
        uncertain={job.draft.uncertain}
        source={sourceOf(job.input)}
        picture={
          job.thumbnail && (
            <Thumbnail src={`/api/imports/${job.id}/thumbnail`} size={job.thumbnail} shape="full" />
          )
        }
        submitLabel={t("editor.saveToMyRecipes")}
        leave={{
          kind: "discard",
          discard: () => {
            discard.mutate();
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
