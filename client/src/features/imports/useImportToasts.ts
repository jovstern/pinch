import type { Import } from "@pinch/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import {
  dismissToast,
  toastCouldntSave,
  toastDailyLimit,
  toastImportFailed,
  toastReady,
} from "../../lib/toasts.tsx";
import { countToLookAt, thingsToLookAt } from "../../lib/thingsToLookAt.ts";
import { importListQuery, limitMessage, retryImport } from "./importQueries.ts";

// What a failed import couldn't read, by what it was made from.
const what: Record<Import["input"]["type"], string> = {
  link: "that video",
  text: "that text",
  images: "those screenshots",
};

// An import that becomes ready or fails says so on whatever page the user is on (design §14,
// pass-02 §13). Used once, in the Layout. Changes are found between two lists of the same query
// the Header polls (§4.2), so it asks for nothing more: only what changed during this visit,
// never what the first list shows. These toasts are the queue's announcements too: Sonner's
// region is live, so the queue has none of its own (one voice, not two).
export function useImportToasts() {
  const { data } = useQuery(importListQuery);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const retry = useMutation({
    mutationFn: retryImport,
    onError: (error, id) => {
      const limit = limitMessage(error);
      if (limit) {
        toastDailyLimit(limit);
      } else {
        toastCouldntSave(() => {
          retry.mutate(id);
        });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: importListQuery.queryKey }),
  });

  // An effect, not state worked out in render (as ListFilters): a toast is outside React, and
  // must be shown once, however often React renders.
  const before = useRef(data);
  useEffect(() => {
    const previous = before.current;
    before.current = data;
    if (previous === undefined || data === undefined) return;
    const now = new Map(data.items.map((job) => [job.id, job.status]));
    // A failure retried (from its card or another tab) or dismissed: its toast is out of date.
    // A ready one takes its place by itself (the same id).
    for (const job of previous.items) {
      const status = now.get(job.id);
      if (job.status === "failed" && status !== "failed" && status !== "ready") {
        dismissToast(job.id);
      }
    }
    const statuses = new Map(previous.items.map((job) => [job.id, job.status]));
    for (const job of data.items) {
      if (statuses.get(job.id) === job.status) continue;
      if (job.status === "ready") {
        const count = countToLookAt(job);
        toastReady(
          job.id,
          job.draft?.title ?? "Your recipe",
          () => {
            void navigate(`/imports/${job.id}`);
          },
          count > 0 ? thingsToLookAt(count) : undefined,
        );
      }
      if (job.status === "failed") {
        // No Retry when no retry can fix it (D23).
        const again = job.noRetry
          ? undefined
          : () => {
              retry.mutate(job.id);
            };
        toastImportFailed(job.id, `Couldn't read ${what[job.input.type]}`, job.error, again);
      }
    }
  }, [data, navigate, retry]);
}
