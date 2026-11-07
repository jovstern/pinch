import { ImportSchema, type Import } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button.tsx";
import { deleteResource, sendJson } from "../../lib/api.ts";
import { importListQuery } from "./importQueries.ts";

// What a failed link offers (design §4.2): Retry puts it back in the queue for three more
// tries; Dismiss deletes it. Either way the list is asked again, and a retried link is polled.
export function FailedImportActions({ job }: { job: Import }) {
  const queryClient = useQueryClient();
  // Also after a failure: the link may have changed or gone since the list loaded (another tab),
  // and the list then shows it as it is. Awaited, so "Retrying…" lasts until the list is fresh
  // and the failed link never flashes back (as DeleteRecipeButton).
  async function refreshList() {
    await queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
  }
  const retry = useMutation({
    // No body: the address says which import.
    mutationFn: () => sendJson("POST", `/api/imports/${job.id}/retry`, undefined, ImportSchema),
    onSettled: refreshList,
  });
  // No question first, as Discard on the review page: pasting the link again brings it back.
  const dismiss = useMutation({
    mutationFn: () => deleteResource(`/api/imports/${job.id}`),
    onSettled: refreshList,
  });
  const busy = retry.isPending || dismiss.isPending;

  return (
    <>
      <div className="mt-3 flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            retry.mutate();
          }}
          disabled={busy}
        >
          {retry.isPending ? "Retrying…" : "Retry"}
        </Button>
        <Button
          type="button"
          variant="danger-quiet"
          onClick={() => {
            dismiss.mutate();
          }}
          disabled={busy}
        >
          {dismiss.isPending ? "Dismissing…" : "Dismiss"}
        </Button>
      </div>
      {retry.isError && (
        <p role="alert" className="mt-1 text-sm text-danger">
          It couldn't be retried. Try again.
        </p>
      )}
      {dismiss.isError && (
        <p role="alert" className="mt-1 text-sm text-danger">
          It couldn't be dismissed. Try again.
        </p>
      )}
    </>
  );
}
