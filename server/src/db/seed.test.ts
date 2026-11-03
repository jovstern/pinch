import { ObjectId } from "mongodb";
import { expect, test } from "vitest";
import { createTestDb } from "../testDb.ts";
import { recipesCollection, toRecipe } from "./recipes.ts";
import { sampleRecipes, seedRecipes } from "./seed.ts";

const db = createTestDb();
const ownerId = new ObjectId();

test("the seed adds the samples once, and keeps a sample the user edited", async () => {
  const recipes = recipesCollection(db);

  expect(await seedRecipes(db, ownerId)).toBe(sampleRecipes.length);
  await recipes.updateOne({ title: "Red lentil soup" }, { $set: { title: "My lentil soup" } });
  expect(await seedRecipes(db, ownerId)).toBe(0);

  const stored = await recipes.find({ ownerId }).sort({ createdAt: -1 }).toArray();
  expect(stored.map((recipe) => recipe.title)).toEqual([
    "My lentil soup",
    ...sampleRecipes.slice(1).map((sample) => sample.title),
  ]);
  // Each one reads back as the API sends it, with its tags.
  for (const recipe of stored) expect(toRecipe(recipe).tags).not.toEqual([]);
});
