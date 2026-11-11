import {
  RecipeSchema,
  type ListSource,
  type Nutrition,
  type Recipe,
  type RecipeInput,
  type RecipeSort,
} from "@pinch/shared";
import {
  MongoServerError,
  type Collection,
  type Db,
  type Document,
  type Filter,
  type ObjectId,
} from "mongodb";
import { NOT_DELETED } from "./softDelete.ts";
import { WITHOUT_MEDIA, type StoredThumbnail } from "./thumbnail.ts";

// A recipe as it is stored (design §6). A field added here that the form doesn't send must
// also be kept by PUT /api/recipes/:id (routes/recipes.ts, design D20). Recipes saved before
// tags existed have no `tags` field; toRecipe reads them as [].
export type RecipeDocument = RecipeInput & {
  _id: ObjectId;
  ownerId: ObjectId;
  // Gemini's estimate, from the import's draft (design D14).
  nutritionPerServing?: Nutrition;
  // The dish's face when there's no picture (D25): the model's, from the draft, or for a recipe
  // written by hand one its title names (titleEmoji.ts). Older recipes have none.
  emoji?: string;
  // From the import's draft (§5); a recipe written by hand has none.
  thumbnail?: StoredThumbnail;
  // linkKey: the post its link points to (§4.6), from the import; stored, not sent: the client
  // has no use for it.
  source: Recipe["source"] & { linkKey?: string };
  // The import it was approved from: unique, so approving twice can't make two (design §4.4).
  sourceImportId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Set by DELETE, unset by restore: a deleted recipe is kept a while for Undo (D27).
  deletedAt?: Date;
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

// Saves a recipe approved from an import, or answers the one an earlier approve of the same
// import already made: the unique sourceImportId index lets only one in (design §4.4). That one,
// if the user has deleted it since, comes back: approving is asking for it (D27).
export async function insertRecipeOnce(
  recipes: Collection<RecipeDocument>,
  recipe: RecipeDocument,
) {
  try {
    await recipes.insertOne(recipe);
    return recipe;
  } catch (error) {
    // 11000 is Mongo's duplicate key.
    if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
    const made = await recipes.findOneAndUpdate(
      { sourceImportId: recipe.sourceImportId, ownerId: recipe.ownerId },
      { $unset: { deletedAt: "" } },
      { returnDocument: "after" },
    );
    // Deleted since the insert failed: rare, and a 500 then, as any database error.
    if (!made) throw error;
    return made;
  }
}

// The user's recipe from this post, if they have one (design §4.6): at most one, as a cursor so
// its plan can be explained (the partial { ownerId, "source.linkKey" } index).
export function findRecipeOfLink(
  recipes: Collection<RecipeDocument>,
  ownerId: ObjectId,
  linkKey: string,
) {
  return recipes
    .find({ ownerId, "source.linkKey": linkKey, ...NOT_DELETED }, { projection: { title: 1 } })
    .limit(1);
}

// A page of the list: never an unbounded list (node-api.md).
export const PAGE_SIZE = 50;

// The list's three orders (design §7): each sorts by one value, then _id the same way, so two
// recipes with the same value keep one order from page to page. Quickest is by totalMinutes,
// which no recipe stores: findRecipes works it out (TOTAL_MINUTES).
const sortOrders = {
  newest: { field: "createdAt", direction: -1 },
  quickest: { field: "totalMinutes", direction: 1 },
  az: { field: "title", direction: 1 },
} as const;

// A–Z ignores case ("apple" before "Banana"): strength 2 compares letters and accents, not
// case. The title index has the same collation, or the sort couldn't use it (db/indexes.ts).
export const TITLE_COLLATION = { locale: "en", strength: 2 };

// The time a recipe takes: prep and cook together, or the one it has. One with neither is
// unknown, and counts as longer than any real time: Quickest puts it last, and every time
// filter leaves it out. (The largest a recipe can have is 2 × 1440.) Worked out here only, in
// the query: Quickest's cursor reads it from the recipes it answers.
const UNKNOWN_MINUTES = 1_000_000;
const TOTAL_MINUTES = {
  // $add of a missing field is null; $ifNull answers the first of its values that isn't.
  $ifNull: [
    { $add: ["$prepMinutes", "$cookMinutes"] },
    "$prepMinutes",
    "$cookMinutes",
    UNKNOWN_MINUTES,
  ],
};

// Where the next page starts: the last recipe of the page before, by the order's value (a
// date, a number of minutes or a title) and its id (design §7, D11).
export type RecipeCursor = { value: Date | number | string; _id: ObjectId };

export type RecipeListOptions = {
  // A search: any of its words in the title or an ingredient.
  q?: string;
  // Every one of these tags.
  tags?: string[];
  // Any of these sources.
  sources?: ListSource[];
  // At most this many minutes in all (TOTAL_MINUTES).
  maxMinutes?: number;
  // Left out: newest first, or with a search, the best match first.
  sort?: RecipeSort;
  after?: RecipeCursor;
};

// A recipe the list read: with Quickest, its time too, for the cursor.
export type ListedRecipe = RecipeDocument & { totalMinutes?: number };

// My recipes, narrowed and in the order asked, after the cursor (design §7). It reads one more
// than a page, so the route knows whether another page follows without the client asking for
// an empty one.
//
// A search keeps its 50 best matches (by Mongo's text score, one page, no cursor): best first,
// or in the order asked when one is. Matching is by word, with English stemming ("eggs" finds "egg"); Hebrew
// matches whole words. q is Mongo's $search syntax: "a phrase" in quotes, and -word leaves a word
// out.
//
// Newest and A–Z read their index in order (db/indexes.ts). Quickest and the time filter work out
// each recipe's time, so they read all of the user's recipes that pass the other filters: one
// household's library: hundreds, at most a few thousand.
export function findRecipes(
  recipes: Collection<RecipeDocument>,
  ownerId: ObjectId,
  { q, tags = [], sources = [], maxMinutes, sort, after }: RecipeListOptions = {},
) {
  const filter: Filter<RecipeDocument> = { ownerId, ...NOT_DELETED };
  if (q) filter.$text = { $search: q };
  if (tags.length > 0) filter.tags = { $all: tags };
  if (sources.length > 0) filter["source.type"] = { $in: sources };
  if (maxMinutes !== undefined) filter.$expr = { $lte: [TOTAL_MINUTES, maxMinutes] };

  const pipeline: Document[] = [{ $match: filter }];
  // _id breaks ties between equal scores, so the cut at 50 is the same every time.
  if (q)
    pipeline.push({ $sort: { score: { $meta: "textScore" }, _id: -1 } }, { $limit: PAGE_SIZE });
  // A search without an order stays best match first, as the cut left it.
  const order = sort ?? (q ? undefined : "newest");
  if (order) {
    const { field, direction } = sortOrders[order];
    if (order === "quickest") pipeline.push({ $addFields: { totalMinutes: TOTAL_MINUTES } });
    if (after) pipeline.push({ $match: afterCursor(field, direction, after) });
    pipeline.push({ $sort: { [field]: direction, _id: direction } });
  }
  pipeline.push({ $limit: PAGE_SIZE + 1 }, { $project: WITHOUT_MEDIA });
  return recipes.aggregate<ListedRecipe>(
    pipeline,
    order === "az" ? { collation: TITLE_COLLATION } : {},
  );
}

// The recipes after the cursor, in the order's direction; at the same value, the ones after its
// _id (the sort's tiebreak), so two recipes with the same time or title are neither skipped nor
// shown twice. The plain range ($lte or $gte) starts the index scan at the cursor; without it,
// Mongo's plan read every recipe of the pages before and threw them away (checked with explain).
function afterCursor(field: string, direction: 1 | -1, { value, _id }: RecipeCursor) {
  const past = direction === 1 ? "$gt" : "$lt";
  const from = direction === 1 ? "$gte" : "$lte";
  return {
    [field]: { [from]: value },
    $or: [{ [field]: { [past]: value } }, { [field]: value, _id: { [past]: _id } }],
  };
}
