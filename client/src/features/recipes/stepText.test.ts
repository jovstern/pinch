import { expect, test } from "vitest";
import { stepText } from "./stepText.ts";

test("a range of numbers is joined to its dash, so it isn't split across lines", () => {
  expect(stepText("Bake 8–10 minutes, or 15-30 דקות.")).toBe(
    "Bake 8\u2060–\u206010 minutes, or 15\u2060-\u206030 דקות.",
  );
  expect(stepText("Add salt - to taste.")).toBe("Add salt - to taste.");
});
