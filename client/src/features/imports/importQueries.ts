import { ImportListSchema, ImportSchema, type ImportList } from "@pinch/shared";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { ApiError, deleteResource, getJson, sendJson } from "../../lib/api.ts";
import { dismissToast, toastCancelled } from "../../lib/toasts.tsx";

// My imports, newest first: few, as done ones are deleted (design §4.1). One request for all of
// them, asked again every 2 s while the worker has any of them in hand, so each one's status
// moves on screen; then it stops.
export const importListQuery = queryOptions({
  queryKey: ["imports", "list"],
  queryFn: () => getJson("/api/imports", ImportListSchema),
  refetchInterval: (query) => pollInterval(query.state.data),
});

// Before the first render of / (main.tsx): settles once the queue is in, or has failed (no
// connection, a non-OK answer such as 401 or 500), or after `ms`, whichever comes first. Never
// rejects and never waits longer, so the page is never left blank: past it, the page renders as
// usual and the queue shows when it comes.
export function queueKnown(queryClient: QueryClient, ms = 1000) {
  return Promise.race([
    queryClient.query(importListQuery).then(
      () => undefined,
      () => undefined,
    ),
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}

export function pollInterval(list: ImportList | undefined) {
  const working = list?.items.some(
    (job) => job.status === "pending" || job.status === "processing",
  );
  return working ? 2000 : false;
}

// One import, for its review page.
export function importQuery(id: string) {
  return queryOptions({
    queryKey: ["imports", "detail", id],
    queryFn: () => getJson(`/api/imports/${id}`, ImportSchema),
  });
}

// Back in the queue for three more tries (design §4.2): from a failed card or its toast. No
// body: the address says which import.
export function retryImport(id: string) {
  return sendJson("POST", `/api/imports/${id}/retry`, undefined, ImportSchema);
}

// Undo of a discard or a dismiss (D27): the import is back in the queue as it was, and the queue's
// own toast says so (useImportToasts).
export async function restoreImport(queryClient: QueryClient, id: string) {
  await sendJson("POST", `/api/imports/${id}/restore`, undefined, ImportSchema);
  await queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
}

// Undo of Pinch it: deleted, whatever the worker has got to; its draft never shows (§4.3). Its
// ready toast closes, if it got that far. Already gone (a 404: discarded or dismissed meanwhile, in
// another tab) is as good as cancelled.
export async function cancelImport(queryClient: QueryClient, id: string) {
  try {
    await deleteResource(`/api/imports/${id}`);
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
  dismissToast(id);
  await queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
  toastCancelled();
}
