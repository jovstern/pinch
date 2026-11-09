import type { Recipe } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "../../components/ui/AlertDialog.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { deleteResource } from "../../lib/api.ts";
import { toastDeleted } from "../../lib/toasts.tsx";
import { recipeListsKey } from "./recipeQueries.ts";

type DeleteRecipeDialogProps = {
  recipe: Recipe;
  onClose: () => void;
  // Where focus goes when it closes: the ⋯ button (RecipeMenu). Radix would give it back to what
  // had focus when it opened (a menu item, gone by then), and Safari doesn't focus a clicked
  // button: as the dialog has no Trigger of its own, focus would land on the page there.
  focusOnClose: () => void;
};

// Deleting can't be undone, so it asks first.
export function DeleteRecipeDialog({ recipe, onClose, focusOnClose }: DeleteRecipeDialogProps) {
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
      await queryClient.invalidateQueries({
        queryKey: recipeListsKey,
        refetchType: "all",
      });
      void navigate("/recipes");
      // A failure stays in the dialog, by its buttons:
      // the dialog shuts out a toast's.
      toastDeleted(recipe.title);
    },
  });

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
        <AlertDialogTitle className="text-lg font-semibold">Delete this recipe?</AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-pretty text-text-muted">
          “{recipe.title}” will be gone for good.
        </AlertDialogDescription>
        {deletion.isError && (
          <p role="alert" className="mt-3 text-danger">
            It couldn't be deleted. Try again.
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <AlertDialogCancel asChild>
            <Button variant="secondary">Keep it</Button>
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
          >
            {deletion.isPending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
