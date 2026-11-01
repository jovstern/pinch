import { RecipeInputSchema, type RecipeList } from "@pinch/shared";
import express from "express";
import { ObjectId, type Db } from "mongodb";
import { recipesCollection, toRecipe, type RecipeDocument } from "../db/recipes.ts";
import { HttpError, parseInput } from "../errors.ts";

// Every query filters by ownerId: a user only ever sees their own recipes (design §1, §8.3).
export function recipesRouter(db: Db) {
  const recipes = recipesCollection(db);
  const router = express.Router();

  router.get("/", async (req, res) => {
    // Never an unbounded list (node-api.md): the newest 50 until M3 adds the cursor (§7).
    // When thumbnails arrive (M6), project them out here: lists don't send them (§5).
    const items = await recipes
      .find({ ownerId: req.userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(50)
      .toArray();
    res.json({ items: items.map(toRecipe), nextCursor: null } satisfies RecipeList);
  });

  router.post("/", async (req, res) => {
    const input = parseInput(RecipeInputSchema, req.body);
    const now = new Date();
    const recipe: RecipeDocument = {
      ...input,
      _id: new ObjectId(),
      ownerId: req.userId,
      source: { type: "manual" },
      createdAt: now,
      updatedAt: now,
    };
    await recipes.insertOne(recipe);
    res.status(201).location(`/api/recipes/${recipe._id.toHexString()}`).json(toRecipe(recipe));
  });

  router.get("/:id", async (req, res) => {
    const recipe = await recipes.findOne({ _id: parseId(req.params.id), ownerId: req.userId });
    if (!recipe) throw recipeNotFound();
    res.json(toRecipe(recipe));
  });

  // PUT, not PATCH: the form always sends the whole recipe, so an optional field it leaves out
  // is cleared rather than kept (design §8).
  router.put("/:id", async (req, res) => {
    const input = parseInput(RecipeInputSchema, req.body);
    const filter = { _id: parseId(req.params.id), ownerId: req.userId };
    const existing = await recipes.findOne(filter);
    if (!existing) throw recipeNotFound();
    // Every stored field the form doesn't send is kept here, or replaceOne erases it. When
    // thumbnail and sourceImportId arrive (M4, M6), add them (design D20).
    const recipe: RecipeDocument = {
      ...input,
      _id: existing._id,
      ownerId: existing.ownerId,
      source: existing.source,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    };
    // Deleted between the read and the write: not found, like any missing recipe.
    const { matchedCount } = await recipes.replaceOne(filter, recipe);
    if (matchedCount === 0) throw recipeNotFound();
    res.json(toRecipe(recipe));
  });

  router.delete("/:id", async (req, res) => {
    const { deletedCount } = await recipes.deleteOne({
      _id: parseId(req.params.id),
      ownerId: req.userId,
    });
    if (deletedCount === 0) throw recipeNotFound();
    res.status(204).end();
  });

  return router;
}

// An id that can't exist is simply not found (mongodb.md: validate ids before querying).
function parseId(id: string) {
  if (!ObjectId.isValid(id)) throw recipeNotFound();
  return new ObjectId(id);
}

function recipeNotFound() {
  return new HttpError(404, "recipe_not_found", "This recipe doesn't exist.");
}
