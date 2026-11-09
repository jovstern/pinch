import type { Ingredient } from "@pinch/shared";
import { expect, test } from "vitest";
import { stepIngredients } from "./stepIngredients.ts";

const ingredients: Ingredient[] = [
  { name: "Spaghetti", quantity: "200", unit: "g" },
  { name: "olive oil", quantity: "2", unit: "tbsp" },
  { name: "garlic", quantity: "2", unit: "cloves" },
  { name: "קמח", quantity: "320", unit: "גרם" },
];

test("finds an ingredient a step names, in any case, and not inside another word (oil in boil)", () => {
  expect(stepIngredients("Boil the spaghetti in salted water.", ingredients)).toEqual([0]);
});

test("finds an ingredient by its last word", () => {
  expect(stepIngredients("Warm the oil, then fry the garlic.", ingredients)).toEqual([1, 2]);
});

test("finds a Hebrew ingredient with a prefix attached", () => {
  expect(stepIngredients("מנפים את הקמח לקערה.", ingredients)).toEqual([3]);
});

test("finds none in a step that names none", () => {
  expect(stepIngredients("Let it rest for 10 minutes.", ingredients)).toEqual([]);
});
