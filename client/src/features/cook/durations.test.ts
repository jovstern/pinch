import { expect, test } from "vitest";
import { stepDurations } from "./durations.ts";

test("finds minutes, hours and seconds, written in full or short", () => {
  expect(stepDurations("Simmer 20 min, then rest 1 hour. Stir for 30 seconds.")).toEqual([
    { label: "20 min", seconds: 1200 },
    { label: "1 hour", seconds: 3600 },
    { label: "30 seconds", seconds: 30 },
  ]);
});

test("times a range by its shorter end", () => {
  expect(stepDurations("Bake 6–7 Minutes.")).toEqual([{ label: "6–7 Minutes", seconds: 360 }]);
});

test("finds Hebrew durations", () => {
  expect(stepDurations("מבשלים 10 דקות ומניחים לשעה, או 2 שעות.")).toEqual([
    { label: "10 דקות", seconds: 600 },
    { label: "2 שעות", seconds: 7200 },
  ]);
});

test("reads decimals, worded ranges and a hyphenated unit", () => {
  expect(stepDurations("Rest 1.5 hours, or 1,5 שעות.")).toEqual([
    { label: "1.5 hours", seconds: 5400 },
    { label: "1,5 שעות", seconds: 5400 },
  ]);
  expect(stepDurations("Bake 10 to 12 minutes after a 20-minute rest.")).toEqual([
    { label: "10 to 12 minutes", seconds: 600 },
    { label: "20-minute", seconds: 1200 },
  ]);
});

test("finds none where a number isn't a time, or is a fraction it can't read", () => {
  expect(stepDurations("Add 2 minced onions and 200 g pasta.")).toEqual([]);
  expect(stepDurations("Rest about 1 1/2 hours.")).toEqual([]);
});
