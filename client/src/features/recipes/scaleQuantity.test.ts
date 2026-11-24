import { expect, test } from "vitest";
import { scaleIngredients, scaleQuantity as scaledWithMarks } from "./scaleQuantity.ts";

// What's read: the isolates around a fraction are tested on their own, below.
function scaleQuantity(quantity: string, factor: number) {
  return scaledWithMarks(quantity, factor).replace(/[\u2066\u2069]/g, "");
}

test("multiplies each number in a quantity, in every form recipes write it", () => {
  expect(scaleQuantity("2", 2)).toBe("4");
  expect(scaleQuantity("1 1/2", 2)).toBe("3");
  expect(scaleQuantity("1/2", 3)).toBe("1½");
  expect(scaleQuantity("½", 0.5)).toBe("¼");
  expect(scaleQuantity("1½", 2)).toBe("3");
  expect(scaleQuantity("1.5", 3)).toBe("4½");
  expect(scaleQuantity("1,5", 2)).toBe("3");
  expect(scaleQuantity("1,000", 2)).toBe("2000");
  expect(scaleQuantity("2-3", 2)).toBe("4-6");
  expect(scaleQuantity("about 2 large", 1.5)).toBe("about 3 large");
});

test("shows a fraction a cook measures, a tenth under 10, a whole number from 10", () => {
  expect(scaleQuantity("1", 1 / 3)).toBe("⅓");
  expect(scaleQuantity("2", 2 / 3)).toBe("1⅓");
  expect(scaleQuantity("3", 0.8)).toBe("2.4");
  expect(scaleQuantity("400", 1 / 3)).toBe("133");
  expect(scaleQuantity("3", 0.66)).toBe("2");
});

test("keeps a quantity without a number, and any quantity at ×1, as written", () => {
  expect(scaleQuantity("a pinch", 2)).toBe("a pinch");
  expect(scaleQuantity("1/0", 2)).toBe("1/0");
  expect(scaleQuantity("1 1/2", 1)).toBe("1 1/2");
});

test("scales the ingredients' quantities only", () => {
  expect(
    scaleIngredients(
      [
        { name: "eggs", quantity: "2" },
        { name: "salt", unit: "2 g bags" },
      ],
      2,
    ),
  ).toEqual([
    { name: "eggs", quantity: "4" },
    { name: "salt", unit: "2 g bags" },
  ]);
});

test("sets an amount with a fraction left to right, so a Hebrew line doesn't flip it", () => {
  expect(scaledWithMarks("1 1/2", 1.5)).toBe("\u20662¼\u2069");
  expect(scaledWithMarks("2-3", 1.5)).toBe("\u20663-4½\u2069");
  expect(scaledWithMarks("2", 2)).toBe("4");
});
