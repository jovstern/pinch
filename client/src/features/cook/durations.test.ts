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

test("finds none where a number isn't a time", () => {
  expect(stepDurations("Add 2 minced onions and 200 g pasta.")).toEqual([]);
});
