import { expect, test } from "vitest";
import { parseVideoInfo } from "./videoInfo.ts";

test("the length and the caption are read from yt-dlp's JSON", () => {
  const json = JSON.stringify({ id: "abc", duration: 144, description: "2 eggs", title: "x" });

  expect(parseVideoInfo(json)).toEqual({ seconds: 144, caption: "2 eggs" });
});

test("a post with no length or caption reads as unknown length and an empty caption", () => {
  expect(parseVideoInfo(JSON.stringify({ duration: null }))).toEqual({
    seconds: undefined,
    caption: "",
  });
});
