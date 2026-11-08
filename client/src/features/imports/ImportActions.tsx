import { dailyLimitMessage, ImportSchema, type Import } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/Button.tsx";
import { ApiError, deleteResource, sendJson } from "../../lib/api.ts";
import { importListQuery } from "./importQueries.ts";

// What a failed import offers (design §4.2): Retry puts it back in the queue for three more
// tries; Dismiss deletes it. A stalled one (no worker is taking it, §4.3), and a failure no retry
// can fix (D23), offer only Dismiss. Either way the list is asked again, and a retried one is polled.
// Once it's done the buttons are gone, so focus moves to the paste box (focusPasteBox) rather
// than falling to the page.
export function ImportActions({ job, focusPasteBox }: { job: Import; focusPasteBox: () => void }) {
  const queryClient = useQueryClient();
  // Also after a failure: the import may have changed or gone since the list loaded (another tab),
  // and the list then shows it as it is. Awaited, so "Retrying…" lasts until the list is fresh
  // and the failed import never flashes back (as DeleteRecipeButton).
  async function refreshList() {
    await queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
  }
  const retry = useMutation({
    // No body: the address says which import.
    mutationFn: () => sendJson("POST", `/api/imports/${job.id}/retry`, undefined, ImportSchema),
    onSuccess: focusPasteBox,
    onSettled: refreshList,
  });
  // No question first, as Discard on the review page: pasting it again brings it back.
  const dismiss = useMutation({
    mutationFn: () => deleteResource(`/api/imports/${job.id}`),
    onSuccess: focusPasteBox,
    onSettled: refreshList,
  });
  // Not disabled while busy: a disabled button drops focus to the page (as Show more).
  const busy = retry.isPending || dismiss.isPending;

  return (
    <>
      <div className="mt-3 flex gap-3">
        {job.status === "failed" && !job.noRetry && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (!busy) retry.mutate();
            }}
            aria-disabled={busy}
            aria-describedby={`import-${job.id}`}
          >
            {retry.isPending ? "Retrying…" : "Retry"}
          </Button>
        )}
        <Button
          type="button"
          variant="danger-quiet"
          onClick={() => {
            if (!busy) dismiss.mutate();
          }}
          aria-disabled={busy}
          aria-describedby={`import-${job.id}`}
        >
          {dismiss.isPending ? "Dismissing…" : "Dismiss"}
        </Button>
      </div>
      {retry.isError && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {retry.error instanceof ApiError && retry.error.status === 429
            ? dailyLimitMessage
            : "It couldn't be retried. Try again."}
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
