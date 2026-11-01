import { RecipeInputSchema } from "@pinch/shared";
import express from "express";
import { ObjectId, type Db } from "mongodb";
import { recipesCollection, toRecipe, type RecipeDocument } from "../db/recipes.ts";
import { HttpError, parseInput } from "../errors.ts";

// Every query filters by ownerId: a user only ever sees their own recipes (design §1, §8.3).
export function recipesRouter(db: Db) {
  const recipes = recipesCollection(db);
  const router = express.Router();

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
