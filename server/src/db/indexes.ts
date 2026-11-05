import type { Db } from "mongodb";
import { importsCollection } from "./imports.ts";
import { recipesCollection } from "./recipes.ts";

// Every query the app runs has its index here (design §6, mongodb.md); `npm run db:indexes`
// creates them. One that already exists is left as it is, so it's safe to run again.
export async function createIndexes(db: Db) {
  await recipesCollection(db).createIndexes([
    // My recipes, newest first, and the cursor's next page (findNewestRecipes).
    { key: { ownerId: 1, createdAt: -1, _id: -1 } },
    // The same, filtered by tags. The index holds one entry per tag of a recipe (multikey), so
    // the scan reads the recipes with the first tag and checks the others on each (design §7).
    { key: { ownerId: 1, tags: 1, createdAt: -1, _id: -1 } },
    // Text search inside my recipes (searchRecipes). A collection has at most one text index;
    // ownerId before it means every search must name the owner, which it always does.
    { key: { ownerId: 1, title: "text", "ingredients.name": "text" } },
  ]);
  await importsCollection(db).createIndexes([
    // My imports, newest first; _id breaks ties, as for recipes (GET /api/imports).
    { key: { ownerId: 1, createdAt: -1, _id: -1 } },
    // TTL: Mongo deletes an import once its expiresAt has passed, checking about once a minute
    // (design §4.3). The worker's claim index comes with the worker.
    { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
  ]);
}
