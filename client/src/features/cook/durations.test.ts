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
    { label: "לשעה", seconds: 3600 },
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

test("hours then minutes are one timer", () => {
  expect(stepDurations("Bake 1 hour 20 minutes, then 1 hr and 5 min more.")).toEqual([
    { label: "1 hour 20 minutes", seconds: 4800 },
    { label: "1 hr and 5 min", seconds: 3900 },
  ]);
  expect(stepDurations("אופים שעה ו-20 דקות.")).toEqual([
    { label: "שעה ו-20 דקות", seconds: 4800 },
  ]);
});

test("times written in words, in English and Hebrew", () => {
  expect(stepDurations("Rest for half an hour, or an hour if you can.")).toEqual([
    { label: "half an hour", seconds: 1800 },
    { label: "an hour", seconds: 3600 },
  ]);
  expect(stepDurations("מבשלים כחצי שעה, מקררים כשעה, ואופים שעה וחצי.")).toEqual([
    { label: "כחצי שעה", seconds: 1800 },
    { label: "כשעה", seconds: 3600 },
    { label: "שעה וחצי", seconds: 5400 },
  ]);
  expect(stepDurations("מערבבים 5 דק' ומוסיפים.")).toEqual([{ label: "5 דק'", seconds: 300 }]);
});

test("a Hebrew time in words keeps its value with any prefix, and more words for times", () => {
  expect(stepDurations("מבשלים בחצי שעה, ואחר כך שעתיים.")).toEqual([
    { label: "בחצי שעה", seconds: 1800 },
    { label: "שעתיים", seconds: 7200 },
  ]);
  expect(stepDurations("Rest an hour and a half, then 5 דק׳.")).toEqual([
    { label: "an hour and a half", seconds: 5400 },
    { label: "5 דק׳", seconds: 300 },
  ]);
});
