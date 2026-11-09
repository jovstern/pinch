import { ImportSchema, type Import } from "@pinch/shared";
import type { Binary, Collection, Db, ObjectId } from "mongodb";
import type { StoredThumbnail } from "./thumbnail.ts";

// An import as it is stored (design §6): the job the worker runs. nextAttemptAt says when it may
// be claimed (now, or after a backoff); leaseUntil, how long the worker holding it may keep it
// (§4.3); expiresAt, when the TTL index deletes it if it's abandoned. stalled isn't stored:
// toImport works it out each time.
export type ImportDocument = Omit<
  Import,
  "id" | "input" | "stalled" | "thumbnail" | "createdAt" | "updatedAt"
> & {
  _id: ObjectId;
  // Only a screenshots input has images (the type lets any have them: a separate union member
  // would stop TypeScript narrowing input.images): kept, as JPEGs, until the draft is made
  // (screenshots.ts); the API says only how many.
  input: Import["input"] & { images?: Binary[] };
  // The draft's picture, made by the worker; the recipe takes it on approve (§5). Named as on
  // a recipe, so one projection leaves the image out of both (WITHOUT_MEDIA).
  thumbnail?: StoredThumbnail;
  ownerId: ObjectId;
  nextAttemptAt: Date;
  leaseUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
};

export function importsCollection(db: Db) {
  return db.collection<ImportDocument>("imports");
}

// As toRecipe: the id and dates become strings, and parsing drops the server's own fields.
export function toImport(job: ImportDocument): Import {
  return ImportSchema.parse({
    ...job,
    id: job._id.toHexString(),
    stalled: isStalled(job, new Date()),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  });
}

// An import is deleted 7 days after it was created, whatever its state: one left unreviewed or
// failed is abandoned (§4.3). expiresAt is set once and never moved.
export const IMPORT_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

// The most GET /api/imports answers: a guard, never reached in use.
export const IMPORT_LIST_LIMIT = 50;

// How long a worker may hold a job before another may take it (design §4.3).
export const LEASE_MS = 3 * 60 * 1000;

// Takes the oldest job that's ready to run, in one atomic step: find it and mark it as ours
// together, so two workers can never take the same one (design §4.3). Ready means waiting with
// its time come, or held by a worker whose lease ran out: that worker crashed. Each claim
// counts an attempt, and that count also tells this attempt from a later one (runImport). The
// step starts empty: a crashed attempt's is left on the job.
export function claimNextImport(imports: Collection<ImportDocument>, now: Date) {
  return imports.findOneAndUpdate(
    {
      $or: [
        { status: "pending", nextAttemptAt: { $lte: now } },
        { status: "processing", leaseUntil: { $lt: now } },
      ],
    },
    {
      $set: {
        status: "processing",
        leaseUntil: new Date(now.getTime() + LEASE_MS),
        updatedAt: now,
      },
      $inc: { attempts: 1 },
      $unset: { step: "" },
    },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );
}

// A job is due at nextAttemptAt, or, held, again when its lease runs out: what the claim's $or
// above asks. Running workers look every second and an attempt ends within its deadline, so one
// still unclaimed this long after it was due means no worker is running (§4.3). Not exact: with
// more than about four links queued ahead of it (two at a time, up to 150 s each), a waiting one
// shows as stalled though the workers are busy. Fine for one user; a worker heartbeat would be
// the exact signal.
const STALLED_AFTER_MS = 5 * 60 * 1000;

function isStalled(job: ImportDocument, now: Date) {
  if (job.status !== "pending" && job.status !== "processing") return false;
  const dueAt = job.status === "processing" ? job.leaseUntil : job.nextAttemptAt;
  return dueAt !== undefined && now.getTime() - dueAt.getTime() > STALLED_AFTER_MS;
}
