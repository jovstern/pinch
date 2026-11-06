import { RecipeInputSchema, type RecipeInput } from "@pinch/shared";
import type { Collection, Filter, UpdateFilter } from "mongodb";
import { setTimeout } from "node:timers/promises";
import type { Logger } from "pino";
import { claimNextImport, LEASE_MS, type ImportDocument } from "../db/imports.ts";

// Turns an import's input into a draft: fakeExtract now, Gemini from M5. It must stop when the
// signal aborts: that's the attempt's deadline.
export type Extract = (input: ImportDocument["input"], signal: AbortSignal) => Promise<RecipeInput>;

// With nothing to do, look again after this long (design §4.3).
const IDLE_MS = 1000;

// An attempt must end inside its lease, or a second worker would claim a job still running
// (§4.3). Half a minute under it leaves time to save.
const ATTEMPT_DEADLINE_MS = LEASE_MS - 30_000;

// Three tries, then the import is failed (§4.2): the wait before the second is 10 s, before the
// third 60 s. After the third there's no wait in the list, so no more tries.
const RETRY_AFTER_MS = [10_000, 60_000];
const MAX_ATTEMPTS = RETRY_AFTER_MS.length + 1;

// What the user reads on a failed import. The cause is in the worker's log.
export const FAILED_MESSAGE = "We couldn't turn this link into a recipe.";

type WorkLoopDeps = {
  imports: Collection<ImportDocument>;
  extract: Extract;
  logger: Logger;
  // Aborted on shutdown: the loop finishes the job in hand (or its idle wait), then stops.
  signal: AbortSignal;
};

// One job at a time: claim it, run it, claim the next. The worker runs two of these side by
// side, so at most two jobs at a time (§4.3).
export async function workLoop({ imports, extract, logger, signal }: WorkLoopDeps) {
  while (!signal.aborted) {
    const job = await claimNextImport(imports, new Date());
    if (job) {
      const deadline = AbortSignal.timeout(ATTEMPT_DEADLINE_MS);
      await runImport({ imports, extract, logger, job, deadline });
    } else {
      await setTimeout(IDLE_MS);
    }
  }
}

type RunImportDeps = Omit<WorkLoopDeps, "signal"> & { job: ImportDocument; deadline: AbortSignal };

// Runs one claimed job: saves its draft for the user to review (§4.1), or, if it fails, leaves
// it to be tried again later, or failed after the last try.
export async function runImport({ imports, extract, logger, job, deadline }: RunImportDeps) {
  const log = logger.child({ importId: job._id.toHexString(), attempt: job.attempts });
  // Every write is only while the job is still this attempt's. The user may have deleted it,
  // or, had this attempt outlived its lease, another worker claimed it and attempts went up.
  // Either way the write updates nothing, and the job is left as it is.
  const thisAttempt: Filter<ImportDocument> = {
    _id: job._id,
    status: "processing",
    attempts: job.attempts,
  };

  // Its worker died on the last try (claimed again after its lease ran out): no more tries.
  if (job.attempts > MAX_ATTEMPTS) {
    log.error("import failed: its worker stopped on the last try");
    await imports.updateOne(thisAttempt, failed());
    return;
  }

  try {
    // Checked like a POST body: what the extractor makes is never trusted as it is (§9).
    const draft = RecipeInputSchema.parse(await extract(job.input, deadline));
    const { matchedCount } = await imports.updateOne(thisAttempt, {
      $set: { status: "ready", draft, updatedAt: new Date() },
      $unset: { leaseUntil: "" },
    });
    if (matchedCount === 0) log.warn("import deleted or claimed again: draft dropped");
    else log.info("import ready");
  } catch (error) {
    // A timeout at the deadline lands here too: it's a failed attempt like any other (§4.3).
    log.error({ err: error }, "import attempt failed");
    const retryAfter = RETRY_AFTER_MS[job.attempts - 1];
    if (retryAfter === undefined) {
      await imports.updateOne(thisAttempt, failed());
      return;
    }
    // Back in the queue; the claim takes it again once nextAttemptAt has passed.
    await imports.updateOne(thisAttempt, {
      $set: {
        status: "pending",
        nextAttemptAt: new Date(Date.now() + retryAfter),
        updatedAt: new Date(),
      },
      $unset: { leaseUntil: "" },
    });
  }
}

function failed(): UpdateFilter<ImportDocument> {
  return {
    $set: { status: "failed", error: FAILED_MESSAGE, updatedAt: new Date() },
    $unset: { leaseUntil: "" },
  };
}
