import type { Import, Platform } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../../components/Button.tsx";
import { ImportActions } from "./ImportActions.tsx";
import { importListQuery } from "./importQueries.ts";

// The links and texts being turned into recipes, each with how far it has got (design §1, §4.2).
// After Retry or Dismiss, focusPasteBox moves focus to the paste box (the buttons are gone).
export function ImportList({ focusPasteBox }: { focusPasteBox: () => void }) {
  const { data, isLoadingError } = useQuery(importListQuery);
  const imports = data?.items ?? [];

  // What a screen reader hears: only what just changed, one import at a time, not the whole list
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
      if (changed) setAnnouncement(`${inputName(changed.input)}: ${statusText(changed)}`);
    }
  }

  return (
    <div className="mt-4">
      {/* Always on the page: a live region must be there before its text changes. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {/* No Try again, unlike the recipes: the list is second to them, and sending an import
          asks for it again. */}
      {isLoadingError && (
        <p role="alert" className="text-danger">
          We couldn't load your imports.
        </p>
      )}
      {imports.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Your imports</h2>
          {/* Dashed and flat: on their way to being recipes, so they don't look like the
              recipe cards below. */}
          <ul className="mt-2 grid gap-2">
            {imports.map((job) => (
              // min-w-0: a grid item is as wide as its content, and the link is one long line.
              <li
                key={job.id}
                className="min-w-0 rounded-card border border-dashed border-border p-3"
              >
                {/* Names the item's buttons and link too (aria-describedby), so a screen
                    reader's list of them says which import each is for. */}
                <p id={`import-${job.id}`} className="font-semibold">
                  {inputName(job.input)}
                </p>
                {/* One line: shared links carry long tracking codes, and a pasted text is long.
                    A link whole on hover; a text, up to 10,000 characters, isn't. dir="auto": a
                    Hebrew text reads right to left, so it's cut at its end, not its start. */}
                <p
                  dir="auto"
                  title={job.input.type === "link" ? job.input.url : undefined}
                  className="truncate text-sm text-text-muted"
                >
                  {inputText(job.input)}
                </p>
                <p className={`mt-1 text-sm ${statusColor(job)}`}>{statusText(job)}</p>
                {job.status === "ready" && (
                  <Button asChild variant="secondary" className="mt-3">
                    <Link to={`/imports/${job.id}`} aria-describedby={`import-${job.id}`}>
                      Review the recipe
                    </Link>
                  </Button>
                )}
                {(job.status === "failed" || job.stalled) && (
                  <ImportActions job={job} focusPasteBox={focusPasteBox} />
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// Ready stands out: it's the one waiting for the user. Stuck is a problem, as failed.
function statusColor(job: Import) {
  if (job.stalled || job.status === "failed") return "text-danger";
  return job.status === "ready" ? "font-semibold text-accent-strong" : "";
}

const platformNames: Record<Platform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
};

// What an import was made from: a link (by its site) or a post's text, pasted (design §1).
function inputName(input: Import["input"]) {
  if (input.type === "link") return `${platformNames[input.platform]} link`;
  return input.type === "text" ? "Pasted text" : "Screenshots";
}

function inputText(input: Import["input"]) {
  if (input.type === "link") return input.url;
  if (input.type === "text") return input.text;
  return input.count === 1 ? "1 image" : `${String(input.count)} images`;
}

// waiting → fetching → analyzing → ready to review, or why it failed (design §1).
function statusText(job: Import) {
  // Not "working on it" forever when nothing is (§4.3).
  if (job.stalled) {
    return "Stuck: nothing has worked on this for a while. Dismiss it and paste it again later.";
  }
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
