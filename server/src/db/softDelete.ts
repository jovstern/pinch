// Deleting a recipe or an import can be undone, from its toast (design D27): DELETE only sets
// deletedAt, restore unsets it, and every query that reads them for the user, or for the worker,
// leaves the deleted ones out. A TTL index then deletes them for good (db/indexes.ts).
export const NOT_DELETED = { deletedAt: { $exists: false } } as const;

// How long a deleted one is kept, to undo: far past the toast's 8 s, so a slow Undo or its Try
// again still finds it. Mongo's TTL check runs about once a minute, so it may stay a little longer.
export const DELETED_KEPT_SECONDS = 60 * 60;
