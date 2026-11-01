import type { Recipe } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertDialog } from "radix-ui";
import { useNavigate } from "react-router";
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
      await queryClient.invalidateQueries({
        queryKey: recipeListQuery.queryKey,
        exact: true,
        refetchType: "all",
      });
      void navigate("/");
    },
  });

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger className="min-h-11 rounded-lg px-4 font-semibold text-danger hover:bg-danger/10 active:bg-danger/20">
        Delete
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
            <AlertDialog.Cancel className="min-h-11 rounded-lg border border-border px-4 font-semibold hover:bg-border/40 active:bg-border/60">
              Keep it
            </AlertDialog.Cancel>
            {/* A plain button, not AlertDialog.Action: Action closes the dialog at once, and
                this one stays open until the delete is done or shows its error. */}
            <button
              type="button"
              onClick={() => {
                deletion.mutate();
              }}
              disabled={deletion.isPending}
              className="min-h-11 rounded-lg bg-danger px-4 font-semibold text-white hover:bg-danger/90 active:bg-danger/80 disabled:opacity-60"
            >
              {deletion.isPending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
