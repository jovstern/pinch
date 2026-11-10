import { expect, test } from "vitest";
import { nearestStep } from "./nearestStep.ts";

// Three cards 300 px wide with an 8 px gap, in a row 332 px wide: the next card peeks 24 px, and
// the row scrolls at most 3 × 300 + 2 × 8 − 332 = 584 px.
const cardStarts = [0, 308, 616];
const scrollEnd = 584;

test("a row at rest on a card's left edge is at that card's step", () => {
  expect(nearestStep(0, cardStarts, scrollEnd)).toBe(0);
  expect(nearestStep(308, cardStarts, scrollEnd)).toBe(1);
});

test("the last card, which can't reach the left edge, is the step at the row's end", () => {
  expect(nearestStep(584, cardStarts, scrollEnd)).toBe(2);
});

test("a row left between two cards is at the nearer one", () => {
  expect(nearestStep(140, cardStarts, scrollEnd)).toBe(0);
  expect(nearestStep(170, cardStarts, scrollEnd)).toBe(1);
});
