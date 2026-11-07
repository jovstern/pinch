import { ImportListSchema, ImportSchema, type ImportList } from "@pinch/shared";
import { queryOptions } from "@tanstack/react-query";
import { getJson } from "../../lib/api.ts";

// My imports, newest first: few, as done ones are deleted (design §4.1). One request for all of
// them, asked again every 2 s while the worker has any of them in hand, so each one's status
// moves on screen; then it stops.
export const importListQuery = queryOptions({
  queryKey: ["imports", "list"],
  queryFn: () => getJson("/api/imports", ImportListSchema),
  refetchInterval: (query) => pollInterval(query.state.data),
});

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
