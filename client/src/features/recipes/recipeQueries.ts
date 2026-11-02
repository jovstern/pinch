import { RecipeListSchema, RecipeSchema } from "@pinch/shared";
import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getJson } from "../../lib/api.ts";

// Keys nest under "recipes": a list is ["recipes", "list", filters], one recipe ["recipes", id].

// What the list is narrowed to: a search, and tags it must all have (design §7). Blank is none.
export type RecipeFilters = { q: string; tags: string[] };

// Every list, whatever its filters: the prefix New, Edit and Delete refetch.
export const recipeListsKey = ["recipes", "list"];

// The list, a page at a time: the first page has no cursor, and each next page asks with the
// nextCursor of the page before. A null cursor means there is no next page (a search has one).
export function recipeListQuery(filters: RecipeFilters) {
  return infiniteQueryOptions({
    queryKey: [...recipeListsKey, filters],
    queryFn: ({ pageParam }) => getJson(listPath(filters, pageParam), RecipeListSchema),
    // The cursor's type comes from here: null alone would make every cursor null.
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function recipeQuery(id: string) {
  return queryOptions({
    queryKey: ["recipes", id],
    queryFn: () => getJson(`/api/recipes/${id}`, RecipeSchema),
  });
}

// The filters as a query string, the same in the page's address and the API's: q=egg&tags=a,b.
// What isn't set is left out (the API answers 400 to an empty tags=).
export function filterParams({ q, tags }: RecipeFilters) {
  const params = new URLSearchParams();
  if (q !== "") params.set("q", q);
  if (tags.length > 0) params.set("tags", tags.join(","));
  return params;
}

function listPath(filters: RecipeFilters, cursor: string | null) {
  const params = filterParams(filters);
  if (cursor !== null) params.set("cursor", cursor);
  const query = params.toString();
  return query === "" ? "/api/recipes" : `/api/recipes?${query}`;
}
