import { RecipeInputSchema, type RecipeInput } from "@pinch/shared";
import type { Collection } from "mongodb";
import { setTimeout } from "node:timers/promises";
import type { Logger } from "pino";
import { claimNextImport, type ImportDocument } from "../db/imports.ts";

// Turns an import's input into a draft: fakeExtract now, Gemini from M5.
export type Extract = (input: ImportDocument["input"]) => Promise<RecipeInput>;

// With nothing to do, look again after this long (design §4.3).
const IDLE_MS = 1000;

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
      await runImport(imports, job, extract, logger);
    } else {
      await setTimeout(IDLE_MS);
    }
  }
}

// Runs one claimed job and saves its draft for the user to review (§4.1).
export async function runImport(
  imports: Collection<ImportDocument>,
  job: ImportDocument,
  extract: Extract,
  logger: Logger,
) {
  const log = logger.child({ importId: job._id.toHexString(), attempt: job.attempts });
  try {
    // Checked like a POST body: what the extractor makes is never trusted as it is (§9).
    const draft = RecipeInputSchema.parse(await extract(job.input));
    // Saved only while the job is still this attempt's. The user may have deleted it, or, had
    // this attempt outlived its lease, another worker claimed it and attempts went up. Either
    // way this updates nothing, and the job is left as it is.
    const { matchedCount } = await imports.updateOne(
      { _id: job._id, status: "processing", attempts: job.attempts },
      { $set: { status: "ready", draft, updatedAt: new Date() }, $unset: { leaseUntil: "" } },
    );
    if (matchedCount === 0) log.warn("import deleted or claimed again: draft dropped");
    else log.info("import ready");
  } catch (error) {
    // Retries with backoff come with §4.3's failure handling; until then a failed job stays
    // processing, and is claimed again once its lease runs out.
    log.error({ err: error }, "import attempt failed");
  }
}
