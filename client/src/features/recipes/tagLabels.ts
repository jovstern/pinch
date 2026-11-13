import { tagFacets, type TagFacet } from "@pinch/shared";
import i18next from "i18next";
import type { en } from "../../locales/en.ts";

// The facets, in the order shown: shared's. Object.keys types its keys as plain strings.
export const facets = Object.keys(tagFacets) as TagFacet[];

// How a facet is named on screen (design §7), in the page's language.
export function facetName(facet: TagFacet) {
  return i18next.t(`tags.facets.${facet}`);
}

// A tag's key in the locales: "cuisine:middle-eastern" is tags.cuisine.middle-eastern.
type TagKey = { [F in TagFacet]: `tags.${F}.${keyof (typeof en)["tags"][F] & string}` }[TagFacet];

// "cuisine:middle-eastern" → "middle eastern", or in Hebrew "מזרח תיכוני": its value, in words
// (design §16.7: the code stays, the label is translated). Every tag a recipe or the address
// holds is one of shared's (TagSchema, readFilters), so each has its key.
export function tagLabel(tag: string) {
  return i18next.t(`tags.${tag.replace(":", ".")}` as TagKey);
}
