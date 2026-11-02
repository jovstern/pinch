import type { Db } from "mongodb";
import { recipesCollection } from "./recipes.ts";

// Every query the app runs has its index here (design §6, mongodb.md); `npm run db:indexes`
// creates them. One that already exists is left as it is, so it's safe to run again.
export async function createIndexes(db: Db) {
  await recipesCollection(db).createIndexes([
    // My recipes, newest first, and the cursor's next page (findNewestRecipes).
    { key: { ownerId: 1, createdAt: -1, _id: -1 } },
  ]);
}
