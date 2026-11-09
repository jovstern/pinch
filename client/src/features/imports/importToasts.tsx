import { dailyLimitMessage, ImportSchema, type Import } from "@pinch/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { ApiError, sendJson } from "../../lib/api.ts";
import { showToast, toastCouldntSave } from "../../lib/toasts.ts";
import { importListQuery } from "./importQueries.ts";

// Sent (design §14): the queue takes it from here. No Undo until the API has one (M8 F4).
export function toastPinching() {
  showToast("message", "Pinching it", {
    description: "Usually under a minute",
    icon: <LoaderCircle className="size-4 motion-safe:animate-spin" />,
    duration: 5000,
  });
}

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
  const { mutate: retry } = useMutation({
    // As Retry on the queue's card (ImportActions).
    mutationFn: (id: string) =>
      sendJson("POST", `/api/imports/${id}/retry`, undefined, ImportSchema),
    onError: (error, id) => {
      // Past the day's cap, trying again won't help (design §1).
      if (error instanceof ApiError && error.status === 429) {
        showToast("error", dailyLimitMessage, { duration: Infinity, closeButton: true });
      } else {
        toastCouldntSave(() => {
          retry(id);
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
    const statuses = new Map(previous.items.map((job) => [job.id, job.status]));
    for (const job of data.items) {
      if (statuses.get(job.id) === job.status) continue;
      if (job.status === "ready") {
        showToast("success", `${job.draft?.title ?? "Your recipe"} is ready to review`, {
          duration: 8000,
          action: { label: "Review", onClick: () => void navigate(`/imports/${job.id}`) },
        });
      }
      if (job.status === "failed") {
        showToast("error", `Couldn't read ${what[job.input.type]}`, {
          description: job.error,
          duration: Infinity,
          closeButton: true,
          // A failure no retry can fix offers none (D23).
          action: job.noRetry
            ? undefined
            : {
                label: "Retry",
                onClick: () => {
                  retry(job.id);
                },
              },
        });
      }
    }
  }, [data, navigate, retry]);
}
