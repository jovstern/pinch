import type { Import, Platform } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../../components/Button.tsx";
import { FailedImportActions } from "./FailedImportActions.tsx";
import { importListQuery } from "./importQueries.ts";

// The links being turned into recipes, each with how far it has got (design §1, §4.2). After
// Retry or Dismiss, focusLinkBox moves focus to the paste box (the buttons are gone).
export function ImportList({ focusLinkBox }: { focusLinkBox: () => void }) {
  const { data, isLoadingError } = useQuery(importListQuery);
  const imports = data?.items ?? [];

  // What a screen reader hears: only what just changed, one link at a time, not the whole list
  // (ui-craft: aria-live for async results). Worked out as each new list arrives, from the one
  // before: React docs, "Storing information from previous renders" (as ListFilters). Kept
  // simple: one change per poll is said, and the same words twice in a row aren't said again.
  const [prevData, setPrevData] = useState(data);
  const [announcement, setAnnouncement] = useState("");
  if (data !== prevData) {
    setPrevData(data);
    // The first list isn't news: it's what the page shows.
    if (prevData !== undefined && data !== undefined) {
      const before = new Map(prevData.items.map((job) => [job.id, job.status]));
      const changed = data.items.find((job) => before.get(job.id) !== job.status);
      if (changed)
        setAnnouncement(`${platformNames[changed.input.platform]} link: ${statusText(changed)}`);
    }
  }

  return (
    <div className="mt-4">
      {/* Always on the page: a live region must be there before its text changes. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {/* No Try again, unlike the recipes: the list is second to them, and sending a link
          asks for it again. */}
      {isLoadingError && (
        <p role="alert" className="text-danger">
          We couldn't load your links.
        </p>
      )}
      {imports.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Your links</h2>
          {/* Dashed and flat: on their way to being recipes, so they don't look like the
              recipe cards below. */}
          <ul className="mt-2 grid gap-2">
            {imports.map((job) => (
              // min-w-0: a grid item is as wide as its content, and the link is one long line.
              <li
                key={job.id}
                className="min-w-0 rounded-lg border border-dashed border-border p-3"
              >
                <p className="font-semibold">{platformNames[job.input.platform]}</p>
                {/* One line: shared links carry long tracking codes. The whole link on hover. */}
                <p title={job.input.url} className="truncate text-sm text-text-muted">
                  {job.input.url}
                </p>
                <p className={`mt-1 text-sm ${statusColors[job.status]}`}>{statusText(job)}</p>
                {job.status === "ready" && (
                  <Button asChild variant="secondary" className="mt-3">
                    <Link to={`/imports/${job.id}`}>Review the recipe</Link>
                  </Button>
                )}
                {job.status === "failed" && (
                  <FailedImportActions job={job} focusLinkBox={focusLinkBox} />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// Ready stands out: it's the one waiting for the user.
const statusColors: Record<Import["status"], string> = {
  pending: "",
  processing: "",
  ready: "font-semibold text-accent-strong",
  failed: "text-danger",
};

const platformNames: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

// waiting → fetching → analyzing → ready to review, or why it failed (design §1).
function statusText(job: Import) {
  switch (job.status) {
    case "pending":
      // Back in the queue after a failed try (§4.3).
      return job.attempts === 0 ? "Waiting to start…" : "That didn't work. Trying again soon…";
    case "processing":
      if (job.step === "fetching") return "Fetching the video…";
      if (job.step === "analyzing") return "Reading the recipe…";
      return "Working on it…";
    case "ready":
      return "Ready to review";
    case "failed":
      return job.error ?? "That didn't work.";
  }
}
