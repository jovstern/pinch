import type { Recipe } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertDialog } from "radix-ui";
import { useNavigate } from "react-router";
import { Button } from "../../components/Button.tsx";
import { deleteResource } from "../../lib/api.ts";
import { recipeListQuery } from "./recipeQueries.ts";

// Deleting can't be undone, so it asks first (a Radix dialog: focus, Escape, screen readers).
export function DeleteRecipeButton({ recipe }: { recipe: Recipe }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const deletion = useMutation({
    mutationFn: () => deleteResource(`/api/recipes/${recipe.id}`),
    onSuccess: async () => {
      // Refresh the list before going back to it, so the deleted recipe never shows there.
      // exact: only the list, not this recipe, which would now answer 404. refetchType "all":
      // the list isn't on screen, and an inactive query isn't refetched otherwise. The deleted
      // recipe stays in the cache; Back shows it briefly, then its refetch finds it gone.
      await queryClient.invalidateQueries({
        queryKey: recipeListQuery.queryKey,
        exact: true,
        refetchType: "all",
      });
      void navigate("/");
    },
  });

  return (
    // Closing clears a failed attempt, so the question opens fresh next time.
    <AlertDialog.Root
      onOpenChange={(open) => {
        if (!open) deletion.reset();
      }}
    >
      <AlertDialog.Trigger asChild>
        <Button variant="danger-quiet">Delete</Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-text/40" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 w-[min(90vw,28rem)] -translate-1/2 rounded-xl bg-surface-raised p-6 shadow-lg">
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
              variant="danger"
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
