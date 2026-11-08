import { RecipeInputSchema, type RecipeInput } from "@pinch/shared";
import type { Collection, UpdateFilter } from "mongodb";
import { setTimeout } from "node:timers/promises";
import type { Logger } from "pino";
import { claimNextImport, LEASE_MS, type ImportDocument } from "../db/imports.ts";

// Turns an import's input into a draft: geminiExtract, or fakeExtract for e2e. It must stop when
// the signal aborts: that's the attempt's deadline. Unknown: runImport checks what it makes.
export type Extract = (input: ImportDocument["input"], signal: AbortSignal) => Promise<unknown>;

// With nothing to do, look again after this long (design §4.3).
const IDLE_MS = 1000;

// An attempt must end inside its lease, or a second worker would claim a job still running
// (§4.3). Half a minute under it leaves time to save.
const ATTEMPT_DEADLINE_MS = LEASE_MS - 30_000;

// Three tries, then the import is failed (§4.2). The wait before the second is 10 s, before
// the third 60 s.
const MAX_ATTEMPTS = 3;

// What the user reads on a failed import. The cause is in the worker's log.
export const FAILED_MESSAGE = "We couldn't turn this into a recipe.";

// A failure no retry can fix (not a recipe, too long): the import fails at once, and the
// message is what the user reads (design §4.2, D23). Any other error is tried again.
export class NoRetryError extends Error {
  override name = "NoRetryError";
}

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
    try {
      const job = await claimNextImport(imports, new Date());
      if (job) {
        const deadline = AbortSignal.timeout(ATTEMPT_DEADLINE_MS);
        await runImport({ imports, extract, logger, job, deadline });
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
  extract: Extract;
  logger: Logger;
  job: ImportDocument;
  deadline: AbortSignal;
};

// Runs one claimed job: saves its draft for the user to review (§4.1), or, if it fails, puts it
// back to be tried again later, or fails it after the last try, or at once when no retry can fix
// it (D23). Only the extraction is caught
// here: a database error goes up to workLoop, which logs it and goes on.
export async function runImport({ imports, extract, logger, job, deadline }: RunImportDeps) {
  const log = logger.child({ importId: job._id.toHexString(), attempt: job.attempts });

  // Every write is only while the job is still this attempt's. The user may have deleted it,
  // or, had this attempt outlived its lease, another worker claimed it and attempts went up.
  // Either way the write updates nothing, and the job is left as it is.
  async function save(update: UpdateFilter<ImportDocument>, done: string) {
    const { matchedCount } = await imports.updateOne(
      { _id: job._id, status: "processing", attempts: job.attempts },
      update,
    );
    if (matchedCount === 0) log.warn("import deleted or claimed again: nothing saved");
    else log.info(done);
  }

  // Its worker died on the last try (claimed again after its lease ran out): no more tries.
  if (job.attempts > MAX_ATTEMPTS) {
    await save(failedUpdate(), "import failed: its worker stopped on the last try");
    return;
  }

  let draft: RecipeInput;
  try {
    // Checked like a POST body: what the extractor makes is never trusted as it is (§9).
    draft = RecipeInputSchema.parse(await extract(job.input, deadline));
  } catch (error) {
    if (error instanceof NoRetryError) {
      await save(failedUpdate(error.message), `import failed: ${error.message}`);
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
        $unset: { leaseUntil: "" },
      },
      "import will be tried again",
    );
    return;
  }

  await save(
    { $set: { status: "ready", draft, updatedAt: new Date() }, $unset: { leaseUntil: "" } },
    "import ready",
  );
}

// The update that fails an import, with the message the user reads (§4.2).
function failedUpdate(message = FAILED_MESSAGE): UpdateFilter<ImportDocument> {
  return {
    $set: { status: "failed", error: message, updatedAt: new Date() },
    $unset: { leaseUntil: "" },
  };
}
