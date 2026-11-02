import type { TagFacet } from "@pinch/shared";

// How the facets are named on screen (design §7). The record type makes every facet need one.
export const facetNames: Record<TagFacet, string> = {
  cuisine: "Cuisine",
  meal: "Meal",
  diet: "Diet",
  flavor: "Flavor",
  fit: "Good for",
};

// The facets, in the order shown (this record's). Object.keys types its keys as plain strings.
export const facets = Object.keys(facetNames) as TagFacet[];

// "cuisine:middle-eastern" → "middle eastern": the value, in words.
export function tagLabel(tag: string) {
  return tag.slice(tag.indexOf(":") + 1).replaceAll("-", " ");
}
