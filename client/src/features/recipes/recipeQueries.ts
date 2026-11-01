import { RecipeListSchema, RecipeSchema } from "@pinch/shared";
import { queryOptions } from "@tanstack/react-query";
import { getJson } from "../../lib/api.ts";

// Keys nest under "recipes", so one invalidation can reach the list and every recipe.
export const recipeListQuery = queryOptions({
  queryKey: ["recipes"],
  queryFn: () => getJson("/api/recipes", RecipeListSchema),
});

export function recipeQuery(id: string) {
  return queryOptions({
    queryKey: ["recipes", id],
    queryFn: () => getJson(`/api/recipes/${id}`, RecipeSchema),
  });
}
