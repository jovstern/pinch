import { dailyLimitMessage, type Import } from "@pinch/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button.tsx";
import { ApiError, deleteResource } from "../../lib/api.ts";
import { toastCouldntSave, toastDismissed } from "../../lib/toasts.tsx";
import { importListQuery, retryImport } from "./importQueries.ts";

// What a failed import offers (design §4.2): Retry puts it back in the queue for three more
// tries; Dismiss deletes it. A stalled one (no worker is taking it, §4.3), and a failure no retry
// can fix (D23), offer only Dismiss. Either way the list is asked again, and a retried one is
// polled.
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
    mutationFn: retryImport,
    onSuccess: focusPasteBox,
    onSettled: refreshList,
  });
  // No question first, as Discard on the review page: pasting it again brings it back.
  const dismiss = useMutation({
    mutationFn: () => deleteResource(`/api/imports/${job.id}`),
    onSuccess: () => {
      focusPasteBox();
      toastDismissed();
    },
    // A toast, so Try again is one tap. Retry's failure stays by the card instead: its 429 says
    // the day's limit, which Try again can't fix.
    onError: () => {
      toastCouldntSave(() => {
        dismiss.mutate();
      });
    },
    onSettled: refreshList,
  });
  // Not disabled while busy: a disabled button drops focus to the page (as Show more).
  const busy = retry.isPending || dismiss.isPending;

  return (
    // One box, so an error below the buttons stays under them in the card's row from 768 px.
    <div className="mt-2 md:mt-0">
      {/* Where Review is on a ready card: Retry, the way forward, rightmost. */}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="destructive-ghost"
          onClick={() => {
            if (!busy) dismiss.mutate();
          }}
          aria-disabled={busy}
          aria-describedby={`import-${job.id}`}
        >
          {dismiss.isPending ? "Dismissing…" : "Dismiss"}
        </Button>
        {job.status === "failed" && !job.noRetry && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!busy) retry.mutate(job.id);
            }}
            aria-disabled={busy}
            aria-describedby={`import-${job.id}`}
          >
            {retry.isPending ? "Retrying…" : "Retry"}
          </Button>
        )}
      </div>
      {retry.isError && (
        <p role="alert" className="mt-1 text-right text-sm text-destructive">
          {retry.error instanceof ApiError && retry.error.status === 429
            ? dailyLimitMessage
            : "It couldn't be retried. Try again."}
        </p>
      )}
    </div>
  );
}
