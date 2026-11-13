import { expect, test } from "vitest";
import { inHebrew } from "../../test-utils.tsx";
import { timeInWords } from "./timeInWords.ts";

// Words joined by no-break spaces (design §16.9), shown here as plain ones.
const words = (seconds: number) => timeInWords(seconds).replaceAll(" ", " ");

test("in English, a timer's time is said in words, hours before minutes", () => {
  expect(words(60)).toBe("1 minute");
  expect(words(20 * 60)).toBe("20 minutes");
  expect(words(3600)).toBe("1 hour");
  expect(words(2 * 3600)).toBe("2 hours");
  expect(words(5400)).toBe("1 hour 30 minutes");
  expect(words(30)).toBe("30 seconds");
});

test("in Hebrew, a timer's time is said in Hebrew, with its dual and its and", async () => {
  await inHebrew();
  expect(words(60)).toBe("דקה");
  expect(words(2 * 60)).toBe("2 דקות");
  expect(words(20 * 60)).toBe("20 דקות");
  expect(words(3600)).toBe("שעה");
  expect(words(2 * 3600)).toBe("שעתיים");
  expect(words(3 * 3600)).toBe("3 שעות");
  expect(words(5400)).toBe("שעה ו‑30 דקות");
  expect(words(3660)).toBe("שעה ודקה");
});
