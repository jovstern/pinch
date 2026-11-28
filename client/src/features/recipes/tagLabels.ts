import { customTagWords, tagFacets, type TagFacet } from "@pinch/shared";
import i18next from "i18next";
import type { en } from "../../locales/en.ts";

// The facets, in the order shown: shared's. Object.keys types its keys as plain strings.
export const facets = Object.keys(tagFacets) as TagFacet[];

// How a facet is named on screen (design §7), in the page's language.
export function facetName(facet: TagFacet) {
  return i18next.t(`tags.facets.${facet}`);
}

// A tag's key in the locales: "cuisine:middle-eastern" is tags.cuisine.middle-eastern. The cast
// below is safe: tagLabels.test.ts walks shared's tags against en, and he is Translation<typeof en>,
// so every tag has its key in both.
type TagKey = { [F in TagFacet]: `tags.${F}.${keyof (typeof en)["tags"][F] & string}` }[TagFacet];

// "cuisine:middle-eastern" → "middle eastern", or in Hebrew "מזרח תיכוני": its value, in words
// (design §16.7: the code stays, the label is translated). A tag of the user's own (D53) is its
// words, as they wrote them. Every other tag a recipe or the address holds is one of shared's
// lists (isTag: readFilters, recipeFormValues), so each has its key.
export function tagLabel(tag: string) {
  return customTagWords(tag) ?? i18next.t(`tags.${tag.replace(":", ".")}` as TagKey);
}
