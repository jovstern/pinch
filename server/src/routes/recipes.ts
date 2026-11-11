import {
  ListSourceSchema,
  RecipeInputSchema,
  RecipeSortSchema,
  TagSchema,
  TimeLimitSchema,
  type RecipeCount,
  type RecipeList,
  type RecipeSort,
} from "@pinch/shared";
import express from "express";
import { ObjectId, type Db } from "mongodb";
import { z } from "zod";
import {
  findRecipes,
  PAGE_SIZE,
  recipesCollection,
  toRecipe,
  type ListedRecipe,
  type RecipeCursor,
  type RecipeDocument,
} from "../db/recipes.ts";
import { NOT_DELETED } from "../db/softDelete.ts";
import { WITHOUT_MEDIA } from "../db/thumbnail.ts";
import { HttpError, parseInput } from "../errors.ts";
import { titleEmoji } from "../titleEmoji.ts";
import { sendThumbnail } from "./thumbnail.ts";

// Every query filters by ownerId: a user only ever sees their own recipes (design §1, §8.3).
// And every read leaves out the deleted ones, kept a while for Undo (D27).
export function recipesRouter(db: Db) {
  const recipes = recipesCollection(db);
  const router = express.Router();

  router.get("/", async (req, res) => {
    const { q, tags, source, time, sort, cursor } = parseInput(ListQuerySchema, req.query);
    const found = await findRecipes(recipes, req.userId, {
      q,
      tags,
      sources: source,
      maxMinutes: time,
      sort,
      // A search answers its best matches as one page, so it has no cursor; one sent with it is
      // ignored (design §7).
      after: q ? undefined : cursor,
    }).toArray();
    const items = found.slice(0, PAGE_SIZE);
    const last = items.at(-1);
    // Only when there is one more recipe after this page: the last page says null. (`last` is
    // always there when there is more; the check is for TypeScript.)
    // A search has no next page, so a cursor's order is always the list's: newest if none.
    const nextCursor =
      found.length > PAGE_SIZE && last ? toCursorText(last, sort ?? "newest") : null;
    res.json({ items: items.map(toRecipe), nextCursor } satisfies RecipeList);
  });

  // The tab's count (design §14): the list is paged, so it can't count them. Its own route, not a
  // total on the list: the header asks on every page, and a count needs no recipes sent.
  router.get("/count", async (req, res) => {
    const count = await recipes.countDocuments({ ownerId: req.userId, ...NOT_DELETED });
    res.json({ count } satisfies RecipeCount);
  });

  router.post("/", async (req, res) => {
    const input = parseInput(RecipeInputSchema, req.body);
    const now = new Date();
    const recipe: RecipeDocument = {
      ...input,
      _id: new ObjectId(),
      ownerId: req.userId,
      // No model to pick one: the title's, if it names a dish we know (D25).
      emoji: titleEmoji(input.title),
      source: { type: "manual" },
      createdAt: now,
      updatedAt: now,
    };
    await recipes.insertOne(recipe);
    res.status(201).location(`/api/recipes/${recipe._id.toHexString()}`).json(toRecipe(recipe));
  });

  router.get("/:id", async (req, res) => {
    const recipe = await recipes.findOne(
      { _id: parseId(req.params.id), ownerId: req.userId, ...NOT_DELETED },
      { projection: WITHOUT_MEDIA },
    );
    if (!recipe) throw recipeNotFound();
    res.json(toRecipe(recipe));
  });

  // The recipe's picture (§5), apart from the recipe, so lists stay small.
  router.get("/:id/thumbnail", async (req, res) => {
    const recipe = await recipes.findOne(
      { _id: parseId(req.params.id), ownerId: req.userId, ...NOT_DELETED },
      { projection: { thumbnail: 1 } },
    );
    // No picture: as good as no recipe, for an <img>.
    if (!recipe?.thumbnail) throw recipeNotFound();
    sendThumbnail(req, res, recipe.thumbnail);
  });

  // PUT, not PATCH: the form always sends the whole recipe, so an optional field it leaves out
  // is cleared rather than kept (design §8).
  router.put("/:id", async (req, res) => {
    const input = parseInput(RecipeInputSchema, req.body);
    const filter = { _id: parseId(req.params.id), ownerId: req.userId, ...NOT_DELETED };
    const existing = await recipes.findOne(filter);
    if (!existing) throw recipeNotFound();
    // Every stored field the form doesn't send is kept here, or replaceOne erases it (D20).
    const recipe: RecipeDocument = {
      ...input,
      _id: existing._id,
      ownerId: existing.ownerId,
      nutritionPerServing: existing.nutritionPerServing,
      emoji: existing.emoji,
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

  // Kept a while, to undo (D27): it's only marked deleted, and every read above leaves it out.
  // Deleting it again is a 404, as for any recipe that isn't there.
  router.delete("/:id", async (req, res) => {
    const { matchedCount } = await recipes.updateOne(
      { _id: parseId(req.params.id), ownerId: req.userId, ...NOT_DELETED },
      { $set: { deletedAt: new Date() } },
    );
    if (matchedCount === 0) throw recipeNotFound();
    res.status(204).end();
  });

  // Undo of a delete: the recipe is back as it was. Safe to repeat: one that isn't deleted is
  // answered as it is. Once the TTL has deleted it for good (D27), it's a 404.
  router.post("/:id/restore", async (req, res) => {
    const recipe = await recipes.findOneAndUpdate(
      { _id: parseId(req.params.id), ownerId: req.userId },
      { $unset: { deletedAt: "" } },
      { returnDocument: "after", projection: WITHOUT_MEDIA },
    );
    if (!recipe) throw recipeNotFound();
    res.json(toRecipe(recipe));
  });

  return router;
}

// The list's query string (design §8). q is a search; blank means none. Tags and sources are
// comma-separated: "cuisine:italian,meal:dinner", "instagram,manual". time is the most minutes a
// recipe takes; sort the order: when left out, newest first, or with q, the best match first.
// The cursor is the order, the last recipe's value in it and its id, "<order>:<value>_<id>": the
// client sends back the nextCursor it was given and never reads it (§7).
const ListQuerySchema = z
  .object({
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
    source: z
      .string("Send the sources once, comma-separated.")
      .transform((text) => text.split(","))
      .pipe(z.array(ListSourceSchema))
      .optional(),
    time: TimeLimitSchema.transform(Number).optional(),
    sort: RecipeSortSchema.optional(),
    cursor: z.string("This cursor isn't valid.").optional(),
  })
  // The cursor must belong to the order asked (it's read by it), so it's checked once sort is
  // known.
  .transform(({ cursor, ...query }, context) => {
    if (cursor === undefined) return { ...query, cursor: undefined };
    const after = parseCursor(cursor, query.sort ?? "newest");
    if (!after) {
      context.issues.push({
        code: "custom",
        path: ["cursor"],
        message: "This cursor isn't valid.",
        input: cursor,
      });
      return z.NEVER;
    }
    return { ...query, cursor: after };
  });

// "<order>:<value>_<id>": the id is the last 24 characters, the value what comes between the
// order's ":" and the "_" before it. Newest's value is the time in milliseconds and Quickest's the
// minutes, both whole numbers; A–Z's is the title, which may hold a "_" or ":" of its own.
function parseCursor(text: string, sort: RecipeSort): RecipeCursor | undefined {
  if (!text.startsWith(`${sort}:`)) return undefined;
  const rest = text.slice(sort.length + 1);
  if (!/^.{1,200}_[0-9a-f]{24}$/s.test(rest)) return undefined;
  const value = rest.slice(0, -25);
  const _id = new ObjectId(rest.slice(-24));
  if (sort === "az") return { value, _id };
  if (!/^\d{1,15}$/.test(value)) return undefined;
  return { value: sort === "newest" ? new Date(Number(value)) : Number(value), _id };
}

function toCursorText(recipe: ListedRecipe, sort: RecipeSort) {
  return `${sort}:${cursorValue(recipe, sort)}_${recipe._id.toHexString()}`;
}

function cursorValue(recipe: ListedRecipe, sort: RecipeSort) {
  if (sort === "newest") return String(recipe.createdAt.getTime());
  if (sort === "quickest") return String(recipe.totalMinutes);
  return recipe.title;
}

// An id that can't exist is simply not found (mongodb.md: validate ids before querying).
function parseId(id: string) {
  if (!ObjectId.isValid(id)) throw recipeNotFound();
  return new ObjectId(id);
}

function recipeNotFound() {
  return new HttpError(404, "recipe_not_found", "This recipe doesn't exist.");
}
