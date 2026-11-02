import { RecipeSchema, type Recipe, type RecipeInput } from "@pinch/shared";
import type { Collection, Db, Filter, ObjectId } from "mongodb";

// A recipe as it is stored (design §6). A field added here that the form doesn't send must
// also be kept by PUT /api/recipes/:id (routes/recipes.ts, design D20). Recipes saved before
// tags existed have no `tags` field; toRecipe reads them as [].
export type RecipeDocument = RecipeInput & {
  _id: ObjectId;
  ownerId: ObjectId;
  source: Recipe["source"];
  createdAt: Date;
  updatedAt: Date;
};

export function recipesCollection(db: Db) {
  return db.collection<RecipeDocument>("recipes");
}

// The API's shape: the id and dates become strings. Parsing with the schema also drops what
// it doesn't name (_id, ownerId), so a stored field never leaks by accident.
export function toRecipe(recipe: RecipeDocument): Recipe {
  return RecipeSchema.parse({
    ...recipe,
    id: recipe._id.toHexString(),
    createdAt: recipe.createdAt.toISOString(),
    updatedAt: recipe.updatedAt.toISOString(),
  });
}

// A page of the list: never an unbounded list (node-api.md).
export const PAGE_SIZE = 50;

// Where the next page starts: the last recipe of the page before (design §7, D11).
export type RecipeCursor = { createdAt: Date; _id: ObjectId };

// My recipes, newest first, with every one of the tags, after the cursor; each shape of the
// query has its index (db/indexes.ts). It reads one more than a page, so the route knows
// whether another page follows without the client asking for an empty one.
// When thumbnails arrive (M6), project them out here: lists don't send them (§5).
export function findNewestRecipes(
  recipes: Collection<RecipeDocument>,
  ownerId: ObjectId,
  { tags = [], after }: { tags?: string[]; after?: RecipeCursor } = {},
) {
  const filter: Filter<RecipeDocument> = { ownerId };
  if (tags.length > 0) filter.tags = { $all: tags };
  if (after) {
    // The range starts the index scan at the cursor; without it, Mongo's plan reads every
    // recipe of the pages before and throws them away (checked with explain).
    filter.createdAt = { $lte: after.createdAt };
    // Older than the cursor; at the same time, a smaller _id (the sort's tiebreak), so two
    // recipes created in the same millisecond are neither skipped nor shown twice.
    filter.$or = [
      { createdAt: { $lt: after.createdAt } },
      { createdAt: after.createdAt, _id: { $lt: after._id } },
    ];
  }
  return recipes
    .find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(PAGE_SIZE + 1);
}
