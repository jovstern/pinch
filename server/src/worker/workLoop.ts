import { messages, RecipeDraftSchema, type ImportStep, type RecipeDraft } from "@pinch/shared";
import type { Collection, UpdateFilter } from "mongodb";
import { setTimeout } from "node:timers/promises";
import type { Logger } from "pino";
import { claimNextImport, LEASE_MS, type ImportDocument } from "../db/imports.ts";
import { findCached, saveCached, type LinkDocument } from "../db/links.ts";
import { NOT_DELETED } from "../db/softDelete.ts";
import type { StoredThumbnail } from "../db/thumbnail.ts";

// What an extractor may do as it goes: say each step as it starts it, save the post's picture
// when it has one (design §5), and log what's worth knowing (each line carries the import's id
// and attempt).
export type Attempt = {
  setStep: (step: ImportStep) => Promise<void>;
  setThumbnail: (thumbnail: StoredThumbnail) => Promise<void>;
  log: Logger;
};

// Turns an import's input into a draft: geminiExtract, or fakeExtract for e2e. It must stop when
// the signal aborts: that's the attempt's deadline. Unknown: runImport checks what it makes.
export type Extract = (
  input: ImportDocument["input"],
  signal: AbortSignal,
  attempt: Attempt,
) => Promise<unknown>;

// With nothing to do, look again after this long (design §4.3).
const IDLE_MS = 1000;

// An attempt must end inside its lease, or a second worker would claim a job still running
// (§4.3). Half a minute under it leaves time to save.
const ATTEMPT_DEADLINE_MS = LEASE_MS - 30_000;

// Three tries, then the import is failed (§4.2). The wait before the second is 10 s, before
// the third 60 s.
const MAX_ATTEMPTS = 3;

// A failure no retry can fix (not a recipe, too long): the import fails at once, and the
// message is what the user reads (design §4.2, D23). Any other error is tried again.
export class NoRetryError extends Error {
  override name = "NoRetryError";
}

// The shared answers (design §4.6, D28), and the model and version this worker makes them with
// (EXTRACTION).
export type LinkCache = { links: Collection<LinkDocument>; model: string; version: string };

type WorkLoopDeps = {
  imports: Collection<ImportDocument>;
  cache: LinkCache;
  extract: Extract;
  logger: Logger;
  // Aborted on shutdown: the loop finishes the job in hand (or its idle wait), then stops.
  signal: AbortSignal;
};

// One job at a time: claim it, run it, claim the next. The worker runs two of these side by
// side, so at most two jobs at a time (§4.3).
export async function workLoop({ imports, cache, extract, logger, signal }: WorkLoopDeps) {
  while (!signal.aborted) {
    try {
      const job = await claimNextImport(imports, new Date());
      if (job) {
        const deadline = AbortSignal.timeout(ATTEMPT_DEADLINE_MS);
        await runImport({ imports, cache, extract, logger, job, deadline });
      } else {
        await setTimeout(IDLE_MS);
      }
    } catch (error) {
      // A database error (Mongo restarting, say): the loop waits and goes on, rather than end
      // the worker, which nothing would start again, leaving every import waiting (§4.3). A job
      // it held is claimed again when its lease runs out; the fence keeps that safe. A bug lands
      // here too, logged as an error each time.
      logger.error({ err: error }, "worker loop failed, trying again");
      await setTimeout(IDLE_MS);
    }
  }
}

type RunImportDeps = {
  imports: Collection<ImportDocument>;
  cache: LinkCache;
  extract: Extract;
  logger: Logger;
  job: ImportDocument;
  deadline: AbortSignal;
};

// Runs one claimed job: saves its draft for the user to review (§4.1), or, if it fails, puts it
// back to be tried again later, or fails it after the last try, or at once when no retry can fix
// it (D23). A link anyone pinched before is copied from the shared answers instead (§4.6). Only
// the extraction (and its step updates) is caught here: a database error after it goes up to
// workLoop, which logs it and goes on.
export async function runImport({ imports, cache, extract, logger, job, deadline }: RunImportDeps) {
  const log = logger.child({ importId: job._id.toHexString(), attempt: job.attempts });
  // How long the attempt took, on its last line: imports take 5–60 s (§12, M6).
  const started = Date.now();

  // Every write is only while the job is still this attempt's. The user may have deleted it
  // (Pinch it's Undo, say: D27), or, had this attempt outlived its lease, another worker claimed
  // it and attempts went up. Either way the write updates nothing, and the job is left as it is:
  // a deleted job never turns ready. Each write is one document's, checked and made in one step,
  // so a delete lands wholly before it or after it (no transactions: D9).
  const ours = {
    _id: job._id,
    status: "processing" as const,
    attempts: job.attempts,
    ...NOT_DELETED,
  };
  // Says whether it saved.
  async function save(update: UpdateFilter<ImportDocument>, done: string) {
    const { matchedCount } = await imports.updateOne(ours, update);
    const ms = Date.now() - started;
    if (matchedCount === 0) log.warn({ ms }, "import deleted or claimed again: nothing saved");
    else log.info({ ms }, done);
    return matchedCount > 0;
  }
  // Progress, not an outcome: not logged. Each end below unsets it.
  async function setStep(step: ImportStep) {
    await imports.updateOne(ours, { $set: { step, updatedAt: new Date() } });
  }
  // As the step; kept whatever the end: a retry makes the same picture again. Remembered, to go
  // with the answer into the shared cache.
  let thumbnail: StoredThumbnail | undefined;
  async function setThumbnail(made: StoredThumbnail) {
    thumbnail = made;
    await imports.updateOne(ours, { $set: { thumbnail: made, updatedAt: new Date() } });
  }

  // Its worker died on the last try (claimed again after its lease ran out): no more tries.
  if (job.attempts > MAX_ATTEMPTS) {
    await save(failedUpdate(), "import failed: its worker stopped on the last try");
    return;
  }

  // A post anyone pinched before: its answer and picture are copied into this import, with the
  // same fenced write as any end, so a deleted job still never turns ready. No yt-dlp, no Gemini
  // (§4.6, D28). Checked as any answer is; one that no longer reads goes the long way. The key is
  // logged, never the user.
  const post = postOf(job);
  const cached = post && (await findCached(cache.links, post.key, cache.version));
  const cachedDraft = cached && RecipeDraftSchema.safeParse(cached.draft);
  if (cached && cachedDraft?.success) {
    log.info({ key: cached.key }, "cache hit");
    await save(readyUpdate(cachedDraft.data, cached.thumbnail), "import ready");
    return;
  }

  let draft: RecipeDraft;
  try {
    // Checked like a POST body: what the extractor makes is never trusted as it is (§9).
    draft = RecipeDraftSchema.parse(
      await extract(job.input, deadline, { setStep, setThumbnail, log }),
    );
  } catch (error) {
    if (error instanceof NoRetryError) {
      await save(failedUpdate(error.message, true), `import failed: ${error.message}`);
      return;
    }
    // A timeout at the deadline lands here too: a failed attempt like any other (§4.3).
    log.error({ err: error }, "import attempt failed");
    if (job.attempts === MAX_ATTEMPTS) {
      await save(failedUpdate(), "import failed after its last try");
      return;
    }
    // Back in the queue; the claim takes it again once nextAttemptAt has passed.
    const now = new Date();
    const retryAfter = job.attempts === 1 ? 10_000 : 60_000;
    await save(
      {
        $set: {
          status: "pending",
          nextAttemptAt: new Date(now.getTime() + retryAfter),
          updatedAt: now,
        },
        $unset: { leaseUntil: "", step: "" },
      },
      "import will be tried again",
    );
    return;
  }

  const saved = await save(readyUpdate(draft), "import ready");
  // The answer is kept for the next person to pinch the post (§4.6): only a recipe (a failure
  // returned above), and only once it reached the import. A fresher one replaces an older one.
  if (saved && post) {
    await saveCached(cache.links, {
      ...post,
      version: cache.version,
      draft,
      ...(thumbnail && { thumbnail }),
      model: cache.model,
      extractedAt: new Date(),
    });
  }
}

// The post a job's answer is shared under (§4.6): a link's only (text and screenshots are one
// user's own), and only with its key (a job from before L1 has none, and goes the long way).
function postOf(job: ImportDocument) {
  if (job.input.type !== "link" || !job.linkKey) return undefined;
  return { key: job.linkKey, platform: job.input.platform };
}

// The update that makes an import ready to review, with its draft, and its picture when it comes
// with one (a cache hit's; an attempt saves its own as it goes).
function readyUpdate(
  draft: RecipeDraft,
  thumbnail?: StoredThumbnail,
): UpdateFilter<ImportDocument> {
  return {
    $set: { status: "ready", draft, ...(thumbnail && { thumbnail }), updatedAt: new Date() },
    // Screenshots are kept only until the draft is made (design §4.1): a failed attempt keeps
    // them, for the next try.
    $unset: { leaseUntil: "", step: "", "input.images": "" },
  };
}

// The update that fails an import, with the message the user reads (§4.2), and whether a retry
// could ever fix it (D23). By default the plain one, couldntTurn: the cause is in the worker's
// log. The message is one of shared's, which the queue card says in the page's language (§16.7).
function failedUpdate(
  message: string = messages.couldntTurn,
  noRetry = false,
): UpdateFilter<ImportDocument> {
  return {
    $set: { status: "failed", error: message, noRetry, updatedAt: new Date() },
    $unset: { leaseUntil: "", step: "" },
  };
}
