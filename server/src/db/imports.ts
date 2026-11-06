import { ImportSchema, type Import } from "@pinch/shared";
import type { Collection, Db, ObjectId } from "mongodb";

// An import as it is stored (design §6): the job the worker runs. nextAttemptAt says when it may
// be claimed (now, or after a backoff); leaseUntil, how long the worker holding it may keep it
// (§4.3); expiresAt, when the TTL index deletes it if it's abandoned.
export type ImportDocument = Omit<Import, "id" | "createdAt" | "updatedAt"> & {
  _id: ObjectId;
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
// counts an attempt, and that count also tells this attempt from a later one (runImport).
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
    },
    { sort: { createdAt: 1 }, returnDocument: "after" },
  );
}
