import type { Import } from "@pinch/shared";
import { useQuery } from "@tanstack/react-query";
import i18next from "i18next";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { RecipeFace } from "../../components/RecipeFace.tsx";
import { Thumbnail } from "../../components/Thumbnail.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { platformNames } from "../../lib/platformNames.ts";
import { serverMessage } from "../../lib/serverMessage.tsx";
import { countToLookAt } from "../../lib/thingsToLookAt.ts";
import { importListQuery } from "./importQueries.ts";

// A failed card's Retry and Dismiss load on their own, after the queue: in the entry they put the
// editor's first load over budget (docs/metrics/m08.md, Method note). Their row's height is kept
// meanwhile, so the cards under it don't move.
const ImportActions = lazy(async () => ({
  default: (await import("./ImportActions.tsx")).ImportActions,
}));

// The queue under the input (design §1, §4.2, §14): each link, text or screenshots being turned
// into a recipe, as a card with how far it has got and what can be done with it.
// After Retry or Dismiss, focusPasteBox moves focus to the paste box (the buttons are gone).
export function ImportList({ focusPasteBox }: { focusPasteBox: () => void }) {
  const { t } = useTranslation();
  const { data, isLoadingError, refetch, isFetching } = useQuery(importListQuery);
  const imports = data?.items ?? [];

  return (
    <div className="mt-6">
      {/* The queue is the page's main content, so a failed load can be asked again (as the
          recipes). */}
      {/* Centred, as the empty queue. */}
      {isLoadingError && (
        <div role="alert" className="mt-12 text-center">
          <h2 className="text-xl font-semibold">{t("imports.couldntLoad")}</h2>
          {/* The status stays "error" while it retries, so the button shows the wait. */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-busy={isFetching}
            className="mt-4"
          >
            {isFetching ? t("auth.trying") : t("auth.tryAgain")}
          </Button>
        </div>
      )}
      {/*{data && imports.length === 0 && (*/}
      {/*  <div className="mt-12 text-center">*/}
      {/*    <h2 className="text-xl font-semibold">Nothing cooking yet</h2>*/}
      {/*    <p className="mt-2 text-muted-foreground">*/}
      {/*      Paste a link to an Instagram, Facebook or YouTube video, and Pinch writes the recipe*/}
      {/*      down for you.*/}
      {/*    </p>*/}
      {/*  </div>*/}
      {/*)}*/}
      {imports.length > 0 && (
        <>
          {/* A label over the cards, not a title: the sans face, small. It is the list's
              heading too. */}
          <h2 className="mb-2 font-sans text-sm font-semibold text-muted-foreground">
            {queueSummary(imports)}
          </h2>
          <ul className="grid gap-3">
            {imports.map((job, index) => (
              // min-w-0: a grid item is as wide as its content, and a link is one long line.
              <li
                key={job.id}
                className="flex min-w-0 gap-3 rounded-card border border-border bg-card p-3 md:items-center md:gap-4 md:p-4"
              >
                {/* The first cards' pictures are the page's largest thing on a phone, so they
                    don't wait to be found near the screen, as My recipes' first row
                    (docs/metrics/m08.md). */}
                <Picture job={job} eager={index < 2} />
                {/* Phone: the action under the words. From 768 px: at the end. */}
                <div className="min-w-0 flex-1 md:flex md:items-center md:gap-4">
                  <div className="min-w-0 flex-1">
                    {/* Names the card's buttons and link too (aria-describedby), so a screen
                        reader's list of them says which import each is for. The card is laid
                        out by the interface's direction, which reverses #113's dir="ltr" (kept
                        until the app was localised); the title and a pasted text keep their own
                        (dir="auto"), and a link reads left to right (design §16.5, D43). */}
                    <p dir="auto" id={`import-${job.id}`} className="font-semibold break-words">
                      {title(job)}
                    </p>
                    {/* One line: shared links carry long tracking codes, and a pasted text is
                        long. A link whole on hover; a text, up to 10,000 characters, isn't. */}
                    <p
                      dir={job.input.type === "link" ? "ltr" : "auto"}
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
function Picture({ job, eager }: { job: Import; eager: boolean }) {
  if (job.thumbnail) {
    return (
      <Thumbnail
        src={`/api/imports/${job.id}/thumbnail`}
        size={job.thumbnail}
        shape="tile"
        eager={eager}
      />
    );
  }
  if (job.status === "failed" || job.stalled) {
    // The alert, not colour alone.
    return (
      <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-control bg-muted text-destructive">
        <TriangleAlert aria-hidden="true" className="size-5" />
      </div>
    );
  }
  // A text draft, a post without a picture, or one still cooking: the dish's emoji once the
  // draft has one, else the pot, with sparkles for a video (D25).
  return (
    <RecipeFace
      emoji={job.draft?.emoji}
      fromVideo={job.input.type === "link"}
      className="h-20 w-16 shrink-0 rounded-control text-3xl"
    />
  );
}

// One action in one place (pass-02 §13): while it cooks, a disabled "Cooking…" stands where
// Review will be, so the place is learned before it can be used.
function Action({ job, focusPasteBox }: { job: Import; focusPasteBox: () => void }) {
  const { t } = useTranslation();
  if (job.status === "failed" || job.stalled) {
    return (
      <Suspense fallback={<div className="mt-2 h-11 md:mt-0" />}>
        <ImportActions job={job} focusPasteBox={focusPasteBox} />
      </Suspense>
    );
  }
  return (
    <div className="mt-2 flex justify-end md:mt-0">
      {job.status === "ready" ? (
        <Button asChild variant="outline">
          <Link to={`/imports/${job.id}`} aria-describedby={`import-${job.id}`}>
            {t("imports.review")}
          </Link>
        </Button>
      ) : (
        // Disabled, so out of the tab order: the status line says what's happening.
        <Button type="button" variant="outline" disabled aria-describedby={`import-${job.id}`}>
          <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
          {t("imports.cooking")}
        </Button>
      )}
    </div>
  );
}

// "2 ready · 1 in progress · 1 failed" (design §14), leaving out what's none, each by its plural
// (§16.3). In progress is waiting or being worked on; a stalled one is counted as failed, as its
// card says it is stuck.
function queueSummary(imports: Import[]) {
  const failed = imports.filter((job) => job.status === "failed" || job.stalled).length;
  const ready = imports.filter((job) => job.status === "ready").length;
  const inProgress = imports.length - failed - ready;
  return [
    ready > 0 && i18next.t("imports.ready", { count: ready }),
    inProgress > 0 && i18next.t("imports.inProgress", { count: inProgress }),
    failed > 0 && i18next.t("imports.failed", { count: failed }),
  ]
    .filter(Boolean)
    .join(" · ");
}

// Ready stands out: it's the one waiting for the user. Stuck is a problem, as failed. One being
// worked on (fetching, analyzing) shimmers (globals.css), as long as the worker has it; waiting
// in the queue, or to try again, nothing is working on it yet, so it stays still. w-fit: the
// band sweeps the words, not the card's whole width.
function statusColor(job: Import) {
  if (job.stalled || job.status === "failed") return "text-destructive";
  if (job.status === "processing") return "w-fit shimmer";
  return job.status === "ready" ? "font-semibold text-primary" : "text-muted-foreground";
}

// The draft's title once there is one; until then what it was made from: a link (by its site),
// a post's text, pasted, or its screenshots (design §1).
function title(job: Import) {
  if (job.draft) return job.draft.title;
  const input = job.input;
  if (input.type === "link") {
    return i18next.t("imports.platformLink", { platform: platformNames[input.platform] });
  }
  if (input.type === "text") return i18next.t("imports.pastedText");
  return i18next.t("imports.screenshots");
}

function inputText(input: Import["input"]) {
  if (input.type === "link") return input.url;
  if (input.type === "text") return input.text;
  return i18next.t("imports.images", { count: input.count });
}

// waiting → fetching → analyzing → ready to review, or why it failed (design §1).
function statusText(job: Import): ReactNode {
  // Not "working on it" forever when nothing is (§4.3).
  if (job.stalled) {
    return i18next.t("imports.stuck");
  }
  switch (job.status) {
    case "pending":
      // Back in the queue after a failed try (§4.3).
      return job.attempts === 0 ? i18next.t("imports.waiting") : i18next.t("imports.retryingSoon");
    case "processing":
      if (job.step === "fetching") return i18next.t("imports.fetching");
      if (job.step === "analyzing") return i18next.t("imports.analyzing");
      return i18next.t("imports.working");
    case "ready":
      return <ReadyText count={countToLookAt(job)} />;
    case "failed":
      return failureReason(job.error);
  }
}

// Why it failed: the worker's reason, kept in English, said in the page's language (design §16.7).
function failureReason(error: string | undefined): ReactNode {
  if (error === undefined) return i18next.t("imports.didntWork");
  return serverMessage(error);
}

// "Ready to review · ◆ 3 things to look at" (design §14): the ◆ is the editor's mark, in its
// colour; the words say it without either.
function ReadyText({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count === 0) return t("imports.readyToReview");
  return (
    <>
      {t("imports.readyToReview")} ·{" "}
      <span className="font-normal text-muted-foreground">
        <span aria-hidden="true" className="text-check-mark">
          ◆
        </span>{" "}
        {t("imports.thingsToLookAt", { count })}
      </span>
    </>
  );
}
