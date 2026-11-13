import { expect, test } from "vitest";
import { nearestStep } from "./nearestStep.ts";

// Three cards 300 px wide with an 8 px gap, in a row 332 px wide: the next card peeks 24 px, and
// the row scrolls at most 3 × 300 + 2 × 8 − 332 = 584 px.
const cards = [0, 308, 616].map((offsetLeft) => ({ offsetLeft, offsetWidth: 300 }));
const at = (scrollLeft: number) => ({ scrollLeft, scrollWidth: 916, clientWidth: 332 });

test("a row at rest on a card's left edge is at that card's step", () => {
  expect(nearestStep(at(0), cards, false)).toBe(0);
  expect(nearestStep(at(308), cards, false)).toBe(1);
});

test("the last card, which can't reach the left edge, is the step at the row's end", () => {
  expect(nearestStep(at(584), cards, false)).toBe(2);
});

test("a row left between two cards is at the nearer one", () => {
  expect(nearestStep(at(140), cards, false)).toBe(0);
  expect(nearestStep(at(170), cards, false)).toBe(1);
});

// The same row right to left (Hebrew, design §16.4): the first card at the right, offsetLeft still
// from the left (332 − 300 = 32, then 308 px further left each), and scrollLeft from 0 to −584.
const rtlCards = [32, -276, -584].map((offsetLeft) => ({ offsetLeft, offsetWidth: 300 }));

test("right to left, a row at rest on a card's right edge is at that card's step", () => {
  expect(nearestStep(at(0), rtlCards, true)).toBe(0);
  expect(nearestStep(at(-308), rtlCards, true)).toBe(1);
  expect(nearestStep(at(-584), rtlCards, true)).toBe(2);
});

test("right to left, a row between two cards is at the nearer one", () => {
  expect(nearestStep(at(-140), rtlCards, true)).toBe(0);
  expect(nearestStep(at(-170), rtlCards, true)).toBe(1);
});
