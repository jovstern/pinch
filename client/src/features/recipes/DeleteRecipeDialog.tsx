import { RecipeSchema, type Recipe } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { InSentence } from "../../components/InSentence.tsx";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../../components/ui/AlertDialog.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { deleteResource, sendJson } from "../../lib/api.ts";
import { toastDeleted, toastRestored } from "../../lib/toasts.tsx";
import { focusHeading } from "../../lib/useHeadingFocus.ts";
import { recipeQuery, refetchRecipeLists } from "./recipeQueries.ts";

type DeleteRecipeDialogProps = {
  recipe: Recipe;
  onClose: () => void;
  // Where focus goes when it closes: the ⋯ button (RecipeMenu). Radix would give it back to what
  // had focus when it opened (a menu item, gone by then), and Safari doesn't focus a clicked
  // button: as the dialog has no Trigger of its own, focus would land on the page there.
  focusOnClose: () => void;
};

// It asks first (design §14), and the toast that follows has Undo (D27).
export function DeleteRecipeDialog({ recipe, onClose, focusOnClose }: DeleteRecipeDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const deletion = useMutation({
    mutationFn: () => deleteResource(`/api/recipes/${recipe.id}`),
    onSuccess: async () => {
      // Refresh the lists before going back, so the deleted recipe never shows there: every
      // list (each search and filter seen lately, so "Deleting…" may wait for a few), not this
      // recipe, which would now answer 404. refetchType "all": the lists aren't on screen, and
      // an inactive query isn't refetched otherwise. The deleted recipe stays in the cache;
      // Back shows it briefly, then its refetch finds it gone.
      await refetchRecipeLists(queryClient);
      void navigate("/recipes", { state: focusHeading });
      // A failure stays in the dialog, by its buttons:
      // the dialog shuts out a toast's.
      toastDeleted(recipe.title, restore);
    },
  });

  // Undo (D27): the recipe is back in My recipes, where the user now is, and its page's cache is
  // the API's answer (Back may have found it gone, a 404, since). The user stays put; the toast
  // offers View. The dialog is gone by then: its navigate still works (react-router's keeps the
  // router it had).
  async function restore() {
    const restored = await sendJson(
      "POST",
      `/api/recipes/${recipe.id}/restore`,
      undefined,
      RecipeSchema,
    );
    queryClient.setQueryData(recipeQuery(recipe.id).queryKey, restored);
    await refetchRecipeLists(queryClient);
    toastRestored(restored.title, () => {
      void navigate(`/recipes/${recipe.id}`);
    });
  }

  return (
    // Open while it's on the page; closing (Keep it, Escape) asks to be taken away.
    <AlertDialog
      open
      onOpenChange={(opening) => {
        if (!opening) onClose();
      }}
    >
      <AlertDialogContent
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          focusOnClose();
        }}
      >
        <AlertDialogTitle className="text-lg font-semibold">
          {t("recipe.deleteQuestion")}
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-pretty text-text-muted">
          <InSentence
            sentence={(title) => t("recipe.willBeDeleted", { title })}
            text={recipe.title}
          />
        </AlertDialogDescription>
        {deletion.isError && (
          <p role="alert" className="mt-3 text-danger">
            {t("recipe.couldntDelete")}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="secondary">{t("recipe.keepIt")}</Button>
          </AlertDialogCancel>
          {/* A plain button, not AlertDialog.Action: Action closes the dialog at once, and
                this one stays open until the delete is done or shows its error. */}
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              deletion.mutate();
            }}
            disabled={deletion.isPending}
            aria-busy={deletion.isPending}
          >
            {deletion.isPending ? t("recipe.deleting") : t("recipe.deleteIt")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
