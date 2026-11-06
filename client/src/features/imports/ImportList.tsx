import type { Import, Platform } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { importListQuery } from "./importQueries.ts";

// The links being turned into recipes, each with how far it has got (design §1, §4.2).
export function ImportList() {
  const { data, isLoadingError } = useQuery(importListQuery);
  const imports = data?.items ?? [];

  return (
    // Always on the page, so a new link and each change of status are announced (ui-craft: a
    // live region must be there before its text changes). The whole list is read when it first
    // shows, links and all: there are only a few (done ones are deleted).
    <div aria-live="polite" className="mt-4">
      {/* No Try again, unlike the recipes: the list is second to them, and sending a link
          asks for it again. */}
      {isLoadingError && <p className="text-danger">We couldn't load your links.</p>}
      {imports.length > 0 && (
        <>
          <h2 className="text-lg font-semibold">Your links</h2>
          <ul className="mt-2 grid gap-2">
            {imports.map((job) => (
              <li key={job.id} className="rounded-xl border border-border bg-surface-raised p-4">
                <p className="font-semibold">{platformNames[job.input.platform]}</p>
                <p className="text-sm text-text-muted">{job.input.url}</p>
                {job.status === "ready" ? (
                  <Link
                    to={`/imports/${job.id}`}
                    className="mt-1 inline-block font-semibold text-accent-strong underline"
                  >
                    {statusText(job)}
                  </Link>
                ) : (
                  <p className={`mt-1 text-sm ${job.status === "failed" ? "text-danger" : ""}`}>
                    {statusText(job)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

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
