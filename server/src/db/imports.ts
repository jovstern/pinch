import { ImportSchema, type Import } from "@pinch/shared";
import type { Db, ObjectId } from "mongodb";

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

// An abandoned import is deleted after a week (§4.3).
export const IMPORT_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
