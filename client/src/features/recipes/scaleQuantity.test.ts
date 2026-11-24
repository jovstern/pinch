import { expect, test } from "vitest";
import { scaleIngredients, scaleQuantity } from "./scaleQuantity.ts";

test("multiplies the amount, in every form recipes write it", () => {
  expect(scaleQuantity("2", 2)).toBe("4");
  expect(scaleQuantity("1 1/2", 2)).toBe("3");
  expect(scaleQuantity("1-1/2", 2)).toBe("3");
  expect(scaleQuantity("1/2", 3)).toBe("1½");
  expect(scaleQuantity("½", 0.5)).toBe("¼");
  expect(scaleQuantity("1½", 2)).toBe("3");
  expect(scaleQuantity("1⅜", 2)).toBe("2¾");
  expect(scaleQuantity("1.5", 3)).toBe("4½");
  expect(scaleQuantity(".5", 2)).toBe("1");
  expect(scaleQuantity("1,5", 2)).toBe("3");
  expect(scaleQuantity("1,000", 2)).toBe("2000");
  expect(scaleQuantity("about 2 large", 1.5)).toBe("about 3 large");
});

test("a range scales at both ends, and only the amount scales, not a pack's size", () => {
  expect(scaleQuantity("2-3", 2)).toBe("4-6");
  expect(scaleQuantity("10–12", 0.5)).toBe("5–6");
  expect(scaleQuantity("1½-2", 1.5)).toBe("2¼-3");
  expect(scaleQuantity("2 x 400", 2)).toBe("4 x 400");
  expect(scaleQuantity("1 (14 oz) can", 2)).toBe("2 (14 oz) can");
});

test("shows a fraction a cook measures, a tenth under 10, a whole number from 10", () => {
  expect(scaleQuantity("1", 1 / 3)).toBe("⅓");
  expect(scaleQuantity("2", 2 / 3)).toBe("1⅓");
  expect(scaleQuantity("3", 0.8)).toBe("2.4");
  expect(scaleQuantity("400", 1 / 3)).toBe("133");
  expect(scaleQuantity("3", 0.66)).toBe("2");
});

test("never shows 0 for a small amount", () => {
  expect(scaleQuantity("½", 1 / 12)).toBe("0.04");
  expect(scaleQuantity("¼", 1 / 12)).toBe("0.02");
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
