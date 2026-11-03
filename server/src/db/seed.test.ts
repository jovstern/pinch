import { ObjectId } from "mongodb";
import { expect, test } from "vitest";
import { createTestDb } from "../testDb.ts";
import { recipesCollection, toRecipe } from "./recipes.ts";
import { sampleRecipes, seedRecipes } from "./seed.ts";

const db = createTestDb();
const ownerId = new ObjectId();

test("the seed adds the samples once, keeps an edited one and puts back a deleted one", async () => {
  const recipes = recipesCollection(db);

  expect(await seedRecipes(db, ownerId)).toBe(sampleRecipes.length);
  await recipes.updateOne({ title: "Red lentil soup" }, { $set: { title: "My lentil soup" } });
  expect(await seedRecipes(db, ownerId)).toBe(0);
  await recipes.deleteOne({ title: "Mujadara" });
  expect(await seedRecipes(db, ownerId)).toBe(1);

  const stored = await recipes.find({ ownerId }).sort({ createdAt: -1 }).toArray();
  expect(stored.map((recipe) => recipe.title)).toEqual([
    "My lentil soup",
    ...sampleRecipes.slice(1).map((sample) => sample.title),
  ]);
  // Stored as the API reads it.
  expect(stored[1] && toRecipe(stored[1]).tags).toEqual(sampleRecipes[1]?.tags);
});
