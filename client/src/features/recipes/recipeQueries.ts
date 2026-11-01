import { RecipeListSchema } from "@pinch/shared";
import { queryOptions } from "@tanstack/react-query";
import { getJson } from "../../lib/api.ts";

export const recipeListQuery = queryOptions({
  queryKey: ["recipes"],
  queryFn: () => getJson("/api/recipes", RecipeListSchema),
});
