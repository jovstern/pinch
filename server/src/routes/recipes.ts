import { RecipeInputSchema, TagSchema, type RecipeList } from "@pinch/shared";
import express from "express";
import { ObjectId, type Db } from "mongodb";
import { z } from "zod";
import {
  findNewestRecipes,
  PAGE_SIZE,
  recipesCollection,
  toRecipe,
  type RecipeDocument,
} from "../db/recipes.ts";
import { HttpError, parseInput } from "../errors.ts";

// Every query filters by ownerId: a user only ever sees their own recipes (design §1, §8.3).
export function recipesRouter(db: Db) {
  const recipes = recipesCollection(db);
  const router = express.Router();

  router.get("/", async (req, res) => {
    const { tags, cursor } = parseInput(ListQuerySchema, req.query);
    const found = await findNewestRecipes(recipes, req.userId, { tags, after: cursor }).toArray();
    const items = found.slice(0, PAGE_SIZE);
    const last = items.at(-1);
    // Only when there is one more recipe after this page: the last page says null. (`last` is
    // always there when there is more; the check is for TypeScript.)
    const nextCursor = found.length > PAGE_SIZE && last ? toCursorText(last) : null;
    res.json({ items: items.map(toRecipe), nextCursor } satisfies RecipeList);
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

// The list's query string (design §8). Tags are comma-separated: "cuisine:italian,meal:dinner".
// The cursor is the last recipe's time and id, "<ms>_<id>": the client sends back the nextCursor
// it was given and never reads it (§7).
const ListQuerySchema = z.object({
  tags: z
    .string("Pick tags from the list.")
    .transform((text) => text.split(","))
    .pipe(z.array(TagSchema).max(20, "Filter by up to 20 tags."))
    .optional(),
  cursor: z
    .string("This cursor isn't valid.")
    .regex(/^\d{1,15}_[0-9a-f]{24}$/, "This cursor isn't valid.")
    // The id is the last 24 characters; the time is what comes before the "_".
    .transform((text) => ({
      createdAt: new Date(Number(text.slice(0, -25))),
      _id: new ObjectId(text.slice(-24)),
    }))
    .optional(),
});

function toCursorText(recipe: RecipeDocument) {
  return `${String(recipe.createdAt.getTime())}_${recipe._id.toHexString()}`;
}

// An id that can't exist is simply not found (mongodb.md: validate ids before querying).
function parseId(id: string) {
  if (!ObjectId.isValid(id)) throw recipeNotFound();
  return new ObjectId(id);
}

function recipeNotFound() {
  return new HttpError(404, "recipe_not_found", "This recipe doesn't exist.");
}
