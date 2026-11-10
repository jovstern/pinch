import { expect, test } from "vitest";
import { titleEmoji } from "./titleEmoji.ts";

test("a title that names a dish gets its emoji, whatever the case or plural", () => {
  expect(titleEmoji("Red lentil soup")).toBe("🍲");
  expect(titleEmoji("Greek SALADS")).toBe("🥗");
  expect(titleEmoji("סלט ירקות")).toBe("🥗");
});

test("the narrower dish wins, and a keyword counts only at a word's start", () => {
  expect(titleEmoji("Chicken tacos")).toBe("🌮");
  expect(titleEmoji("Roasted eggplant")).toBe("🍆");
  expect(titleEmoji("Veggie bowl")).toBeUndefined();
});

test("a title that names no dish it knows gets none", () => {
  expect(titleEmoji("Mujadara")).toBeUndefined();
});
