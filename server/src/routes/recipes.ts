import { RecipeInputSchema, TagSchema, type RecipeList } from "@pinch/shared";
import express from "express";
import { ObjectId, type Db } from "mongodb";
import { z } from "zod";
import {
  findNewestRecipes,
  PAGE_SIZE,
  recipesCollection,
  searchRecipes,
  toRecipe,
  type RecipeDocument,
} from "../db/recipes.ts";
import { WITHOUT_MEDIA } from "../db/thumbnail.ts";
import { HttpError, parseInput } from "../errors.ts";
import { sendThumbnail } from "./thumbnail.ts";

// Every query filters by ownerId: a user only ever sees their own recipes (design §1, §8.3).
export function recipesRouter(db: Db) {
  const recipes = recipesCollection(db);
  const router = express.Router();

  router.get("/", async (req, res) => {
    const { q, tags, cursor } = parseInput(ListQuerySchema, req.query);
    // A search answers its best matches as one page, so it has no cursor; one sent with it is
    // ignored (design §7).
    if (q) {
      const matches = await searchRecipes(recipes, req.userId, q, { tags }).toArray();
      res.json({ items: matches.map(toRecipe), nextCursor: null } satisfies RecipeList);
      return;
    }
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
    const recipe = await recipes.findOne(
      { _id: parseId(req.params.id), ownerId: req.userId },
      { projection: WITHOUT_MEDIA },
    );
    if (!recipe) throw recipeNotFound();
    res.json(toRecipe(recipe));
  });

  // The recipe's picture (§5), apart from the recipe, so lists stay small.
  router.get("/:id/thumbnail", async (req, res) => {
    const recipe = await recipes.findOne(
      { _id: parseId(req.params.id), ownerId: req.userId },
      { projection: { thumbnail: 1 } },
    );
    // No picture: as good as no recipe, for an <img>.
    if (!recipe?.thumbnail) throw recipeNotFound();
    sendThumbnail(res, recipe.thumbnail);
  });

  // PUT, not PATCH: the form always sends the whole recipe, so an optional field it leaves out
  // is cleared rather than kept (design §8).
  router.put("/:id", async (req, res) => {
    const input = parseInput(RecipeInputSchema, req.body);
    const filter = { _id: parseId(req.params.id), ownerId: req.userId };
    const existing = await recipes.findOne(filter);
    if (!existing) throw recipeNotFound();
    // Every stored field the form doesn't send is kept here, or replaceOne erases it (D20).
    const recipe: RecipeDocument = {
      ...input,
      _id: existing._id,
      ownerId: existing.ownerId,
      nutritionPerServing: existing.nutritionPerServing,
      thumbnail: existing.thumbnail,
      source: existing.source,
      sourceImportId: existing.sourceImportId,
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

// The list's query string (design §8). q is a search; blank means none. Tags are
// comma-separated: "cuisine:italian,meal:dinner".
// The cursor is the last recipe's time and id, "<ms>_<id>": the client sends back the nextCursor
// it was given and never reads it (§7).
const ListQuerySchema = z.object({
  q: z
    .string("Search for one thing at a time.")
    .trim()
    .max(200, "Keep the search under 200 characters.")
    .optional(),
  tags: z
    .string("Send the tags once, comma-separated.")
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
