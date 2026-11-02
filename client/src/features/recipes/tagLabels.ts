import { tagFacets } from "@pinch/shared";

// How the facets are named on screen (design §7), in the order they're shown.
export const facetNames: Record<keyof typeof tagFacets, string> = {
  cuisine: "Cuisine",
  meal: "Meal",
  diet: "Diet",
  flavor: "Flavor",
  fit: "Good for",
};

// "cuisine:middle-eastern" → "middle eastern": the value, in words.
export function tagLabel(tag: string) {
  return tag.slice(tag.indexOf(":") + 1).replaceAll("-", " ");
}
