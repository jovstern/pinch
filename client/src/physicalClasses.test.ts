import { expect, test } from "vitest";

// Every .ts and .tsx in client/src as text (Vite's glob), except this file, whose pattern and
// examples would find themselves.
const files = import.meta.glob<string>(["./**/*.{ts,tsx}", "!./physicalClasses.test.ts"], {
  query: "?raw",
  import: "default",
  eager: true,
});

// A class that says left or right (design §16.4, D42): margin, padding, inset, text-align, the
// corners and sides of a border, the scroll margin and padding, float and clear. Each has a
// logical twin (ms-, ps-, start-, text-start, rounded-s-, border-s-…) that mirrors in Hebrew.
// Matched as a class, not a word: it starts the text or follows a space, a quote, a backtick
// (\x60), a variant's colon, a negative's minus or a leading !; and margin, padding and inset need
// a value after them (a number, px, auto, full, [arbitrary] or (a variable)), so prose ("the top
// left corner", "bottom-right") and other names (a test's "pr-demo") aren't classes.
const physical = new RegExp(
  [
    String.raw`(?<=^|[\s"'\x60:!])-?(`,
    String.raw`(?:scroll-)?[mp][lr]-(?:\d|px\b|auto\b|\[|\()`,
    String.raw`|(?:left|right)-(?:\d|px\b|auto\b|full\b|\[|\()`,
    String.raw`|text-(?:left|right)\b`,
    String.raw`|rounded-(?:[lr]|[tb][lr])(?:-|\b)`,
    String.raw`|border-[lr](?:-|\b)`,
    String.raw`|(?:float|clear)-(?:left|right)\b`,
    ")",
  ].join(""),
);

test("client/src has no physical (left or right) classes, only logical ones", () => {
  const found = Object.entries(files).flatMap(([file, text]) =>
    text.split("\n").flatMap((line, index) => {
      const match = physical.exec(line);
      return match ? [`${file}:${String(index + 1)}: ${match[0]}`] : [];
    }),
  );
  expect(Object.keys(files).length).toBeGreaterThan(50);
  expect(found).toEqual([]);
});

test("the pattern finds a physical class and leaves prose alone", () => {
  const classes = ["pl-9", "-ml-4", "md:mr-auto", "right-1.5!", "!pr-8", "left-[3px]"];
  const more = ["text-right", "rounded-l-none", "border-r", "rounded-tl-lg", "scroll-pl-4"];
  for (const name of [...classes, ...more]) expect(`"${name}"`).toMatch(physical);
  const prose = ["the top left corner", "bottom-right", "pr-demo", "left-to-right", "ps-4 me-2"];
  for (const text of prose) expect(text).not.toMatch(physical);
});
