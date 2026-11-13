import { z } from "zod";
import { messages } from "./messages.ts";

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

const allTags = Object.entries(tagFacets).flatMap(([facet, values]) =>
  values.map((value) => `${facet}:${value}`),
);

export type TagFacet = keyof typeof tagFacets;

export function isTag(tag: string) {
  return allTags.includes(tag);
}

// An enum, not a check on a string: the JSON schema made from it lists every tag, so Gemini
// can only pick from them (design §9).
export const TagSchema = z.enum(allTags, messages.tag);
