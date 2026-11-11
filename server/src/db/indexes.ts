import type { Db } from "mongodb";
import { importsCollection } from "./imports.ts";
import { loginAttemptsCollection } from "./loginAttempts.ts";
import { recipesCollection, TITLE_COLLATION } from "./recipes.ts";
import { sessionsCollection } from "./sessions.ts";
import { DELETED_KEPT_SECONDS } from "./softDelete.ts";
import { usageCollection } from "./usage.ts";
import { usersCollection } from "./users.ts";

// Every query the app runs has its index here (design §6, mongodb.md); `npm run db:indexes`
// creates them. One that already exists is left as it is, so it's safe to run again.
export async function createIndexes(db: Db) {
  await recipesCollection(db).createIndexes([
    // My recipes, newest first, and the cursor's next page (findRecipes).
    { key: { ownerId: 1, createdAt: -1, _id: -1 } },
    // The same, filtered by tags. The index holds one entry per tag of a recipe (multikey), so
    // the scan reads the recipes with the first tag and checks the others on each (design §7).
    { key: { ownerId: 1, tags: 1, createdAt: -1, _id: -1 } },
    // My recipes A–Z. Its collation ignores case, as the sort does (TITLE_COLLATION): a query
    // uses an index on text only when their collations match.
    { key: { ownerId: 1, title: 1, _id: 1 }, collation: TITLE_COLLATION },
    // Text search inside my recipes (findRecipes with q). A collection has at most one text index;
    // ownerId before it means every search must name the owner, which it always does.
    { key: { ownerId: 1, title: "text", "ingredients.name": "text" } },
    // One recipe per import, so approve is safe to repeat (design §4.4). Sparse: recipes made by
    // hand have no sourceImportId, and aren't in it.
    { key: { sourceImportId: 1 }, unique: true, sparse: true },
    // "Already in My recipes" (findRecipeOfLink, design §4.6). Partial: only recipes from a link
    // have the key.
    {
      key: { ownerId: 1, "source.linkKey": 1 },
      partialFilterExpression: { "source.linkKey": { $exists: true } },
    },
    deletedTtl,
  ]);
  await importsCollection(db).createIndexes([
    // My imports, newest first; _id breaks ties, as for recipes (GET /api/imports).
    { key: { ownerId: 1, createdAt: -1, _id: -1 } },
    // The worker's claim (claimNextImport): both halves of its $or start with status, so both
    // use it. Mongo then sorts the jobs ready to run by createdAt in memory: fine, because the
    // queue is short (it reads every ready job to return one, unlike §6's rule).
    { key: { status: 1, nextAttemptAt: 1 } },
    // TTL: Mongo deletes an import once its expiresAt has passed, checking about once a minute
    // (design §4.3).
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    // "Already pinching it" (findImportOfLink, design §4.6). Partial, as the recipes' one: only
    // links have it. Mongo then checks the status and deletedAt on the few it finds.
    { key: { ownerId: 1, linkKey: 1 }, partialFilterExpression: { linkKey: { $exists: true } } },
    deletedTtl,
  ]);
  await usageCollection(db).createIndexes([
    // One count per user per day (and one "all" count per day, D30) (countImport), unique so two
    // firsts can't make two.
    { key: { ownerId: 1, day: 1 }, unique: true },
    // TTL: a day's count goes two days later.
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ]);
  await usersCollection(db).createIndexes([
    // Login finds the account by its email; unique, so one account per email (design §8.3).
    { key: { email: 1 }, unique: true },
    // A Google sign-in finds its account (A4). Sparse: password accounts have no googleId.
    { key: { googleId: 1 }, unique: true, sparse: true },
  ]);
  await sessionsCollection(db).createIndexes([
    // Every signed-in request finds its session by the cookie's hash (currentUser).
    { key: { tokenHash: 1 }, unique: true },
    // TTL: a session goes once it expires, 30 days after sign-in.
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ]);
  // The login rate limit's counts are found by _id; TTL: each goes once its minute is over.
  await loginAttemptsCollection(db).createIndexes([
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ]);
}

// TTL: Mongo deletes a recipe or an import for good once it has been deleted this long (D27).
// Partial, holding only the deleted ones: no read can use it (they all ask for documents without
// deletedAt), so it never competes with the indexes above.
const deletedTtl = {
  key: { deletedAt: 1 },
  expireAfterSeconds: DELETED_KEPT_SECONDS,
  partialFilterExpression: { deletedAt: { $exists: true } },
};
