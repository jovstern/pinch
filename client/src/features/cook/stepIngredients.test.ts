import type { Ingredient } from "@pinch/shared";
import { expect, test } from "vitest";
import { stepIngredients } from "./stepIngredients.ts";

const ingredients: Ingredient[] = [
  { name: "Spaghetti", quantity: "200", unit: "g" },
  { name: "olive oil", quantity: "2", unit: "tbsp" },
  { name: "garlic", quantity: "2", unit: "cloves" },
  { name: "קמח", quantity: "320", unit: "גרם" },
  { name: "שמן זית", quantity: "2", unit: "כפות" },
  { name: "egg" },
];

test("finds an ingredient a step names, in any case, and not inside another word (oil in boil)", () => {
  expect(stepIngredients("Boil the spaghetti in salted water.", ingredients)).toEqual([0]);
});

test("finds an ingredient by its noun: the last word in English, the first in Hebrew", () => {
  expect(stepIngredients("Warm the oil, then fry the garlic.", ingredients)).toEqual([1, 2]);
  expect(stepIngredients("מחממים את השמן במחבת.", ingredients)).toEqual([4]);
});

test("finds a Hebrew ingredient with one or two prefix letters attached", () => {
  expect(stepIngredients("מנפים את הקמח לקערה.", ingredients)).toEqual([3]);
  expect(stepIngredients("מוסיפים מים והקמח.", ingredients)).toEqual([3]);
});

test("finds a word that goes on: eggs, and eggplant too (a guess, not a parse)", () => {
  expect(stepIngredients("Beat the eggs.", ingredients)).toEqual([5]);
  expect(stepIngredients("Slice the eggplant.", ingredients)).toEqual([5]);
});

test("finds none in a step that names none", () => {
  expect(stepIngredients("Let it rest for 10 minutes.", ingredients)).toEqual([]);
});

test("when one is named whole, others that share only its noun are left out", () => {
  const butters: Ingredient[] = [
    { name: "חמאה מומסת", quantity: "50", unit: "גרם" },
    { name: "חמאה או שמן", note: "לטיגון" },
  ];
  expect(stepIngredients("מוסיפים את החמאה המומסת ומערבבים.", butters)).toEqual([0]);
  // Named by the noun alone, both may be meant.
  expect(stepIngredients("ממיסים חמאה במחבת.", butters)).toEqual([0, 1]);
});
