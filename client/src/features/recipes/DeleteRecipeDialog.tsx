import type { Recipe } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertDialog } from "radix-ui";
import { useNavigate } from "react-router";
import { Button } from "../../components/ui/Button.tsx";
import { deleteResource } from "../../lib/api.ts";
import { recipeListsKey } from "./recipeQueries.ts";

type DeleteRecipeDialogProps = {
  recipe: Recipe;
  onClose: () => void;
  // Where focus goes when it closes: the Delete button (DeleteRecipeButton). Radix would give it
  // back to what had focus when it opened, and Safari doesn't focus a clicked button: with no
  // Radix Trigger, focus would land on the page there.
  focusOnClose: () => void;
};

// Deleting can't be undone, so it asks first (a Radix dialog: focus, Escape, screen readers).
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
    },
  });

  return (
    // Open while it's on the page; closing (Keep it, Escape) asks to be taken away.
    <AlertDialog.Root
      open
      onOpenChange={(opening) => {
        if (!opening) onClose();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-scrim/50" />
        <AlertDialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            focusOnClose();
          }}
          className="fixed top-1/2 left-1/2 w-[min(90vw,28rem)] -translate-1/2 rounded-card border border-border bg-surface-raised p-6 shadow-sheet"
        >
          <AlertDialog.Title className="text-lg font-semibold">
            Delete this recipe?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-pretty text-text-muted">
            “{recipe.title}” will be gone for good.
          </AlertDialog.Description>
          {deletion.isError && (
            <p role="alert" className="mt-3 text-danger">
              It couldn't be deleted. Try again.
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Keep it</Button>
            </AlertDialog.Cancel>
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
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
