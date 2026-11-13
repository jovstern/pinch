import { tagFacets } from "@pinch/shared";
import { expect, test } from "vitest";
import { inHebrew } from "../../test-utils.tsx";
import { facetName, facets, tagLabel } from "./tagLabels.ts";

const tags = facets.flatMap((facet) => tagFacets[facet].map((value) => `${facet}:${value}`));

test("in English, a tag is its value in words, as before M10", () => {
  for (const tag of tags) {
    expect(tagLabel(tag)).toBe(tag.slice(tag.indexOf(":") + 1).replaceAll("-", " "));
  }
  expect(facets.map(facetName)).toEqual(["Cuisine", "Meal", "Diet", "Flavor", "Good for"]);
});

// The codes stay (D46); every tag and facet has its own Hebrew name (design §16.7).
test("in Hebrew, every tag and facet has a Hebrew name, each tag's its own", async () => {
  await inHebrew();
  const labels = tags.map(tagLabel);
  for (const label of [...labels, ...facets.map(facetName)]) {
    expect(label).toMatch(/^[֐-׿ ]+(…)?$/);
  }
  expect(new Set(labels).size).toBe(tags.length);
  expect(tagLabel("cuisine:middle-eastern")).toBe("מזרח תיכוני");
});
