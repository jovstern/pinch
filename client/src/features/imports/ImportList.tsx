import type { Import } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import { CookingPot, LoaderCircle, TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { Thumbnail } from "../../components/Thumbnail.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Skeleton } from "../../components/ui/Skeleton.tsx";
import { platformNames } from "../../lib/platformNames.ts";
import { ImportActions } from "./ImportActions.tsx";
import { importListQuery } from "./importQueries.ts";

// The queue under the input (design §1, §4.2, §14): each link, text or screenshots being turned
// into a recipe, as a card with how far it has got and what can be done with it.
// After Retry or Dismiss, focusPasteBox moves focus to the paste box (the buttons are gone).
export function ImportList({ focusPasteBox }: { focusPasteBox: () => void }) {
  const { data, isLoadingError, refetch, isFetching } = useQuery(importListQuery);
  const imports = data?.items ?? [];
  const ready = imports.filter((job) => job.status === "ready").length;
  const cooking = imports.some(
    (job) => (job.status === "pending" || job.status === "processing") && !job.stalled,
  );

  return (
    <div className="mt-6">
      {/* The queue is the page's main content, so a failed load can be asked again (as the
          recipes). */}
      {/* Centred, as the empty queue. */}
      {isLoadingError && (
        <div role="alert" className="mt-12 text-center">
          <h2 className="text-xl font-semibold">We couldn't load your imports</h2>
          {/* The status stays "error" while it retries, so the button shows the wait. */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="mt-4"
          >
            {isFetching ? "Trying…" : "Try again"}
          </Button>
        </div>
      )}
      {data && imports.length === 0 && (
        <div className="mt-12 text-center">
          <h2 className="text-xl font-semibold">Nothing cooking yet</h2>
          <p className="mt-2 text-muted-foreground">
            Paste a link to an Instagram, Facebook or YouTube video, and Pinch writes the recipe
            down for you.
          </p>
        </div>
      )}
      {imports.length > 0 && (
        <>
          {/* A label over the cards, not a title: the sans face, small. */}
          <h2 className="mb-2 font-sans text-sm font-semibold text-muted-foreground">
            {queueHeading(cooking, ready)}
          </h2>
          <ul className="grid gap-3">
            {imports.map((job) => (
              // min-w-0: a grid item is as wide as its content, and a link is one long line.
              <li
                key={job.id}
                className="flex min-w-0 gap-3 rounded-card border border-border bg-card p-3 md:items-center md:gap-4 md:p-4"
              >
                <Picture job={job} />
                {/* Phone: the action under the words. From 768 px: on the right. */}
                <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Names the card's buttons and link too (aria-describedby), so a screen
                        reader's list of them says which import each is for. */}
                    <p dir="auto" id={`import-${job.id}`} className="font-semibold break-words">
                      {title(job)}
                    </p>
                    {/* One line: shared links carry long tracking codes, and a pasted text is
                        long. A link whole on hover; a text, up to 10,000 characters, isn't.
                        dir="auto": a Hebrew text reads right to left, so it's cut at its end. */}
                    <p
                      dir="auto"
                      title={job.input.type === "link" ? job.input.url : undefined}
                      className="truncate text-sm text-muted-foreground"
                    >
                      {inputText(job.input)}
                    </p>
                    <p className={`mt-1 text-sm ${statusColor(job)}`}>{statusText(job)}</p>
                  </div>
                  <Action job={job} focusPasteBox={focusPasteBox} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// The card's picture: the draft's when it has one; else what state it's in.
function Picture({ job }: { job: Import }) {
  if (job.thumbnail) {
    return <Thumbnail src={`/api/imports/${job.id}/thumbnail`} size={job.thumbnail} shape="tile" />;
  }
  if (job.status === "failed" || job.stalled) {
    // The alert, not colour alone.
    return (
      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-control bg-muted text-destructive">
        <TriangleAlert aria-hidden="true" className="size-5" />
      </div>
    );
  }
  if (job.status === "ready") {
    // A text or screenshots draft: no picture from a post.
    return (
      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-control bg-muted text-muted-foreground">
        <CookingPot aria-hidden="true" className="size-6" />
      </div>
    );
  }
  return <Skeleton className="h-20 w-16 shrink-0" />;
}

// One action in one place (pass-02 §13): while it cooks, a disabled "Cooking…" stands where
// Review will be, so the place is learned before it can be used.
function Action({ job, focusPasteBox }: { job: Import; focusPasteBox: () => void }) {
  if (job.status === "failed" || job.stalled) {
    return <ImportActions job={job} focusPasteBox={focusPasteBox} />;
  }
  return (
    <div className="mt-2 flex justify-end md:mt-0">
      {job.status === "ready" ? (
        <Button asChild variant="outline">
          <Link to={`/imports/${job.id}`} aria-describedby={`import-${job.id}`}>
            Review
          </Link>
        </Button>
      ) : (
        // Disabled, so out of the tab order: the status line says what's happening.
        <Button type="button" variant="outline" disabled aria-describedby={`import-${job.id}`}>
          <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
          Cooking…
        </Button>
      )}
    </div>
  );
}

// "Cooking…" while any is, with how many are ready; "N ready" once none is.
function queueHeading(cooking: boolean, ready: number) {
  if (!cooking && ready > 0) return `${String(ready)} ready`;
  return ready > 0 ? `Cooking… · ${String(ready)} ready` : "Cooking…";
}

// Ready stands out: it's the one waiting for the user. Stuck is a problem, as failed.
function statusColor(job: Import) {
  if (job.stalled || job.status === "failed") return "text-destructive";
  return job.status === "ready" ? "font-semibold text-primary" : "text-muted-foreground";
}

// The draft's title once there is one; until then what it was made from: a link (by its site),
// a post's text, pasted, or its screenshots (design §1).
function title(job: Import) {
  if (job.draft) return job.draft.title;
  const input = job.input;
  if (input.type === "link") return `${platformNames[input.platform]} link`;
  if (input.type === "text") return "Pasted text";
  return "Screenshots";
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
