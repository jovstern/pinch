import { expect, test } from "vitest";
import { keepRangesTogether } from "./ranges.ts";

test("a range of numbers is joined to its dash and set left to right", () => {
  expect(keepRangesTogether("Bake 8–10 minutes, or 15-30 דקות.")).toBe(
    "Bake \u20668\u2060–\u206010\u2069 minutes, or \u206615\u2060-\u206030\u2069 דקות.",
  );
  expect(keepRangesTogether("Add salt - to taste.")).toBe("Add salt - to taste.");
  // Whole numbers, not just the digits by the dash.
  expect(keepRangesTogether("4–16")).toBe("\u20664\u2060–\u206016\u2069");
});
