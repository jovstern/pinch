import {
  isTag,
  ListSourceSchema,
  RecipeListSchema,
  RecipeSchema,
  RecipeSortSchema,
  TimeLimitSchema,
  type ListSource,
  type RecipeSort,
  type TimeLimit,
} from "@pinch/shared";
import { infiniteQueryOptions, keepPreviousData, queryOptions } from "@tanstack/react-query";
import { getJson } from "../../lib/api.ts";

// Keys nest under "recipes": a list is ["recipes", "list", filters], one recipe
// ["recipes", "detail", id], so the lists' prefix never matches a recipe.

// What the list is narrowed to, and its order (design §7): a search, tags it must all have,
// sources it may come from, the most minutes it takes. Blank is none; a blank order is the API's
// own: newest first, or with a search, the best match first.
export type RecipeFilters = {
  q: string;
  tags: string[];
  sources: ListSource[];
  time: TimeLimit | "";
  sort: RecipeSort | "";
};

// My recipes as they are, all of them, newest first.
export const noFilters: RecipeFilters = { q: "", tags: [], sources: [], time: "", sort: "" };

// The Filters taken off, the search and the order kept (the Filters' Clear).
export function withoutFilters({ q, sort }: RecipeFilters): RecipeFilters {
  return { ...noFilters, q, sort };
}

// The API's page, and how many a search answers (design §7).
export const PAGE_SIZE = 50;

// Every list, whatever its filters: the prefix New, Edit and Delete refetch.
export const recipeListsKey = ["recipes", "list"];

// The list, a page at a time: the first page has no cursor, and each next page asks with the
// nextCursor of the page before. A null cursor means there is no next page (a search has one).
export function recipeListQuery(filters: RecipeFilters) {
  return infiniteQueryOptions({
    // A new filters object each render is fine: TanStack compares keys by value.
    queryKey: [...recipeListsKey, filters],
    queryFn: ({ pageParam }) => getJson(listPath(filters, pageParam), RecipeListSchema),
    // The cursor's type comes from here: null alone would make every cursor null.
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // While a new search or tag loads, the list before it stays on screen, dimmed, instead of
    // blinking to placeholder cards on every tick.
    placeholderData: keepPreviousData,
  });
}

export function recipeQuery(id: string) {
  return queryOptions({
    queryKey: ["recipes", "detail", id],
    queryFn: () => getJson(`/api/recipes/${id}`, RecipeSchema),
  });
}

// The filters as a query string, the same in the page's address and the API's:
// q=egg&tags=a,b&source=instagram&time=30&sort=quickest. What isn't set is left out (the API
// answers 400 to an empty tags=).
export function filterParams({ q, tags, sources, time, sort }: RecipeFilters) {
  const params = new URLSearchParams();
  if (q !== "") params.set("q", q);
  if (tags.length > 0) params.set("tags", tags.join(","));
  if (sources.length > 0) params.set("source", sources.join(","));
  if (time !== "") params.set("time", time);
  if (sort !== "") params.set("sort", sort);
  return params;
}

// The filters in the page's address. A value not in the lists (a hand-edited link) is left out
// rather than sent: it's a 400; one written twice is read once.
export function readFilters(params: URLSearchParams): RecipeFilters {
  const list = (name: string) => [...new Set(params.get(name)?.split(","))];
  const q = params.get("q")?.trim() ?? "";
  const sort = RecipeSortSchema.safeParse(params.get("sort")).data ?? "";
  return {
    q,
    tags: list("tags").filter(isTag),
    sources: list("source").flatMap((value) => ListSourceSchema.safeParse(value).data ?? []),
    time: TimeLimitSchema.safeParse(params.get("time")).data ?? "",
    // Without a search, newest is the order already: blank, as Sort's first choice (sortChoices).
    sort: sort === "newest" && q === "" ? "" : sort,
  };
}

function listPath(filters: RecipeFilters, cursor: string | null) {
  const params = filterParams(filters);
  if (cursor !== null) params.set("cursor", cursor);
  const query = params.toString();
  return query === "" ? "/api/recipes" : `/api/recipes?${query}`;
}
