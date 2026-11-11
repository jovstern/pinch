import { ObjectId } from "mongodb";
import { expect, test } from "vitest";
import { createTestDb } from "../testDb.ts";
import { backfillLinkKeys } from "./backfillLinkKeys.ts";
import { IMPORT_LIFETIME_MS, importsCollection, type ImportDocument } from "./imports.ts";
import { recipesCollection, type RecipeDocument } from "./recipes.ts";

const db = createTestDb();
const ownerId = new ObjectId();
const reel = "https://www.instagram.com/reel/C9x/?igsh=abc";

function anImport(input: ImportDocument["input"]): ImportDocument {
  const now = new Date();
  return {
    _id: new ObjectId(),
    ownerId,
    status: "ready",
    input,
    attempts: 1,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + IMPORT_LIFETIME_MS),
  };
}

function aRecipe(source: RecipeDocument["source"]): RecipeDocument {
  const now = new Date();
  return {
    _id: new ObjectId(),
    ownerId,
    title: "Shakshuka",
    ingredients: [{ name: "eggs" }],
    steps: ["Cook it."],
    tags: [],
    source,
    createdAt: now,
    updatedAt: now,
  };
}

test("the backfill keys the links and the recipes from them, once", async () => {
  const imports = importsCollection(db);
  const recipes = recipesCollection(db);
  const link = anImport({ type: "link", url: reel, platform: "instagram" });
  const text = anImport({ type: "text", text: "Shakshuka: eggs and tomatoes." });
  const fromLink = aRecipe({ type: "youtube", url: "https://youtu.be/abc?si=x" });
  const byHand = aRecipe({ type: "manual" });
  await imports.insertMany([link, text]);
  await recipes.insertMany([fromLink, byHand]);

  expect(await backfillLinkKeys(db)).toEqual({ imports: 1, recipes: 1 });

  expect((await imports.findOne({ _id: link._id }))?.linkKey).toBe("instagram:C9x");
  expect(await imports.findOne({ _id: text._id })).not.toHaveProperty("linkKey");
  expect((await recipes.findOne({ _id: fromLink._id }))?.source.linkKey).toBe("youtube:abc");
  expect((await recipes.findOne({ _id: byHand._id }))?.source).toEqual({ type: "manual" });
  // Run again, it has nothing left to do.
  expect(await backfillLinkKeys(db)).toEqual({ imports: 0, recipes: 0 });
});
