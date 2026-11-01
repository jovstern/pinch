import { RecipeSchema, type Recipe, type RecipeInput } from "@pinch/shared";
import type { Db, ObjectId } from "mongodb";

// A recipe as it is stored (design §6). A field added here that the form doesn't send must
// also be kept by PUT /api/recipes/:id (routes/recipes.ts, design D20).
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
