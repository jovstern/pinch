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

// A tag of the user's own (design D53): "custom:" and its words, as the user wrote them but
// trimmed, single-spaced and in lower case, so "Grandma's", "grandma's " and "GRANDMA'S" are one
// tag. No comma: the list's address joins its tags with them (?tags=a,b).
const CUSTOM = "custom:";
export const MAX_CUSTOM_TAG = 30;

export function customTag(words: string) {
  return (
    CUSTOM +
    words
      .replace(/[\s,]+/g, " ")
      .trim()
      .toLowerCase()
  );
}

// A custom tag's words, or undefined for any other tag.
export function customTagWords(tag: string) {
  return tag.startsWith(CUSTOM) ? tag.slice(CUSTOM.length) : undefined;
}

function isCustomTag(tag: string) {
  const words = customTagWords(tag);
  return (
    words !== undefined &&
    words.length >= 1 &&
    words.length <= MAX_CUSTOM_TAG &&
    tag === customTag(words)
  );
}

// One of the lists', or one of the user's own.
export function isTag(tag: string) {
  return allTags.includes(tag) || isCustomTag(tag);
}

// An enum, not a check on a string: the JSON schema made from it lists every tag, so Gemini
// can only pick from them (design §9).
export const TagSchema = z.enum(allTags, messages.tag);

// A tag a saved recipe can have, and the list can be filtered by: the lists', or the user's own
// (D53). The model never writes its own: a draft's tags are TagSchema's.
export const RecipeTagSchema = z.string(messages.tag).refine(isTag, messages.tag);
