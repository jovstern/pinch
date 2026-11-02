import { RecipeListSchema, RecipeSchema } from "@pinch/shared";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getJson } from "../../lib/api.ts";

// Keys nest under "recipes": the list is ["recipes"], one recipe ["recipes", id].

// The list, a page at a time (design §7): the first page has no cursor, and each next page asks
// with the nextCursor of the page before. A null cursor means there is no next page.
export const recipeListQuery = infiniteQueryOptions({
  queryKey: ["recipes"],
  queryFn: ({ pageParam }) => getJson(listPath(pageParam), RecipeListSchema),
  // TanStack takes the cursor's type from here, so it says it can also be a string.
  initialPageParam: null as string | null,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});

export function recipeQuery(id: string) {
  return queryOptions({
    queryKey: ["recipes", id],
    queryFn: () => getJson(`/api/recipes/${id}`, RecipeSchema),
  });
}

function listPath(cursor: string | null) {
  return cursor === null ? "/api/recipes" : `/api/recipes?${new URLSearchParams({ cursor })}`;
}
