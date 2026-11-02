import { z } from "zod";

// The facets and their values (design §7): fixed lists, so filters stay clean and the model
// must pick from them. A tag is "facet:value", one flat array on the recipe (D10).
export const tagFacets = {
  cuisine: [
    "italian",
    "asian",
    "middle-eastern",
    "mexican",
    "american",
    "french",
    "indian",
    "mediterranean",
    "other",
  ],
  meal: ["breakfast", "lunch", "dinner", "snack", "dessert", "drink"],
  diet: [
    "vegetarian",
    "vegan",
    "gluten-free",
    "dairy-free",
    "kosher-dairy",
    "kosher-meat",
    "parve",
  ],
  flavor: ["sweet", "savory", "spicy", "sour", "smoky", "fresh"],
  fit: ["quick", "weeknight", "meal-prep", "party", "kids", "healthy", "comfort"],
};

const allTags = new Set(
  Object.entries(tagFacets).flatMap(([facet, values]) =>
    values.map((value) => `${facet}:${value}`),
  ),
);

export type TagFacet = keyof typeof tagFacets;

export function isTag(tag: string) {
  return allTags.has(tag);
}

export const TagSchema = z.string().refine(isTag, "Pick a tag from the list.");
