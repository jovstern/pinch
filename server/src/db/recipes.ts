import {
  RecipeSchema,
  type Nutrition,
  type Recipe,
  type RecipeInput,
  type Thumbnail,
} from "@pinch/shared";
import {
  MongoServerError,
  type Binary,
  type Collection,
  type Db,
  type Filter,
  type ObjectId,
} from "mongodb";

// A recipe as it is stored (design §6). A field added here that the form doesn't send must
// also be kept by PUT /api/recipes/:id (routes/recipes.ts, design D20). Recipes saved before
// tags existed have no `tags` field; toRecipe reads them as [].
// A thumbnail as stored (design §5): the WebP itself, about 30 KB, and its size.
export type StoredThumbnail = Thumbnail & { webp: Binary };

// What a query reading recipes or imports to send leaves out: the image, served apart.
// Its size stays, so the API can say there is one and how big.
export const WITHOUT_THUMBNAIL_IMAGE = { "thumbnail.webp": 0 } as const;

export type RecipeDocument = RecipeInput & {
  _id: ObjectId;
  ownerId: ObjectId;
  // Gemini's estimate, from the import's draft (design D14).
  nutritionPerServing?: Nutrition;
  // From the import's draft (§5); a recipe written by hand has none.
  thumbnail?: StoredThumbnail;
  source: Recipe["source"];
  // The import it was approved from: unique, so approving twice can't make two (design §4.4).
  sourceImportId?: ObjectId;
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

// Saves a recipe approved from an import, or answers the one an earlier approve of the same
// import already made: the unique sourceImportId index lets only one in (design §4.4).
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
    const made = await recipes.findOne({
      sourceImportId: recipe.sourceImportId,
      ownerId: recipe.ownerId,
    });
    // Deleted since the insert failed: rare, and a 500 then, as any database error.
    if (!made) throw error;
    return made;
  }
}

// A page of the list: never an unbounded list (node-api.md).
export const PAGE_SIZE = 50;

// Where the next page starts: the last recipe of the page before (design §7, D11).
export type RecipeCursor = { createdAt: Date; _id: ObjectId };

// My recipes, newest first, with every one of the tags, after the cursor; each shape of the
// query has its index (db/indexes.ts). It reads one more than a page, so the route knows
// whether another page follows without the client asking for an empty one.
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
    .find(filter, { projection: WITHOUT_THUMBNAIL_IMAGE })
    .sort({ createdAt: -1, _id: -1 })
    .limit(PAGE_SIZE + 1);
}

// My recipes with any of the words of q in the title or an ingredient, the best matches first,
// with every one of the tags (design §7). One page: a search answers its best 50, no cursor.
// Matching is by word, with English stemming ("eggs" finds "egg"); Hebrew matches whole words.
// q is Mongo's $search syntax: "a phrase" in quotes, and -word leaves a word out.
export function searchRecipes(
  recipes: Collection<RecipeDocument>,
  ownerId: ObjectId,
  q: string,
  { tags = [] }: { tags?: string[] } = {},
) {
  const filter: Filter<RecipeDocument> = { ownerId, $text: { $search: q } };
  if (tags.length > 0) filter.tags = { $all: tags };
  // Equal scores, newest first.
  return recipes
    .find(filter, { projection: WITHOUT_THUMBNAIL_IMAGE })
    .sort({ score: { $meta: "textScore" }, createdAt: -1, _id: -1 })
    .limit(PAGE_SIZE);
}
