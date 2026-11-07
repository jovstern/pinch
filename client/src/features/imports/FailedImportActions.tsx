import { ImportSchema, type Import } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button.tsx";
import { deleteResource, sendJson } from "../../lib/api.ts";
import { importListQuery } from "./importQueries.ts";

// What a failed link offers (design §4.2): Retry puts it back in the queue for three more
// tries; Dismiss deletes it. Either way the list is asked again, and a retried link is polled.
export function FailedImportActions({ job }: { job: Import }) {
  const queryClient = useQueryClient();
  const refreshList = () => queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
  const retry = useMutation({
    // No body: the address says which import.
    mutationFn: () => sendJson("POST", `/api/imports/${job.id}/retry`, undefined, ImportSchema),
    onSuccess: refreshList,
  });
  // No question first, as Discard on the review page: pasting the link again brings it back.
  const dismiss = useMutation({
    mutationFn: () => deleteResource(`/api/imports/${job.id}`),
    onSuccess: refreshList,
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
      {(retry.isError || dismiss.isError) && (
        <p role="alert" className="mt-1 text-sm text-danger">
          That didn't go through. Try again.
        </p>
      )}
    </>
  );
}
