import type { Db } from "mongodb";
import { importsCollection } from "./imports.ts";
import { recipesCollection, TITLE_COLLATION } from "./recipes.ts";
import { usageCollection } from "./usage.ts";

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
  ]);
  await usageCollection(db).createIndexes([
    // One count per user per day (countImport), unique so two firsts can't make two.
    { key: { ownerId: 1, day: 1 }, unique: true },
    // TTL: a day's count goes two days later.
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ]);
}
