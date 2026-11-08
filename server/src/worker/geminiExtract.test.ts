import { GenerateContentResponse, GoogleGenAI } from "@google/genai";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ImportDocument } from "../db/imports.ts";
import { GEMINI_MODEL, geminiExtract, NOT_A_RECIPE, TOO_LONG } from "./geminiExtract.ts";
import { readVideoInfo } from "./videoInfo.ts";
import { NoRetryError } from "./workLoop.ts";

// yt-dlp is replaced too: no test reads a real post.
vi.mock("./videoInfo.ts");

// A real client with a made-up key; its one call is replaced, so nothing reaches Gemini.
const ai = new GoogleGenAI({ apiKey: "test" });
const extract = geminiExtract(ai);
const noDeadline = new AbortController().signal;

beforeEach(() => {
  vi.mocked(readVideoInfo).mockResolvedValue({ seconds: 60, caption: "2 eggs, 1 can tomatoes" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const youtube: ImportDocument["input"] = {
  type: "link",
  url: "https://www.youtube.com/shorts/abc123",
  platform: "youtube",
};

const recipe = {
  isRecipe: true,
  title: "Shakshuka",
  ingredients: [{ name: "eggs" }],
  steps: ["Crack them."],
};

// What Gemini answers: the JSON text of its one candidate.
function answer(text: string) {
  const response = new GenerateContentResponse();
  response.candidates = [{ content: { parts: [{ text }] } }];
  return response;
}

test("a YouTube link is sent to Gemini with its caption and the recipe's schema, and its JSON comes back", async () => {
  const generate = vi
    .spyOn(ai.models, "generateContent")
    .mockResolvedValue(answer(JSON.stringify(recipe)));

  expect(await extract(youtube, noDeadline)).toEqual(recipe);

  const request = generate.mock.calls[0]?.[0];
  expect(request?.model).toBe(GEMINI_MODEL);
  expect(request?.contents).toContainEqual({ fileData: { fileUri: youtube.url } });
  expect(JSON.stringify(request?.contents)).toContain("2 eggs, 1 can tomatoes");
  // The tags are listed, so the model can only pick from them.
  expect(JSON.stringify(request?.config?.responseJsonSchema)).toContain('"meal:dinner"');
  // And the nutrition estimate, which only the model gives (D14).
  expect(JSON.stringify(request?.config?.responseJsonSchema)).toContain('"nutritionPerServing"');
});

test("pasted text is sent alone, fenced as data: no video, so no yt-dlp", async () => {
  const generate = vi
    .spyOn(ai.models, "generateContent")
    .mockResolvedValue(answer(JSON.stringify(recipe)));

  await extract({ type: "text", text: "Shakshuka: 4 eggs, 1 can tomatoes." }, noDeadline);

  expect(readVideoInfo).not.toHaveBeenCalled();
  expect(generate.mock.calls[0]?.[0].contents).toEqual([
    expect.stringContaining("<post-text>\nShakshuka: 4 eggs, 1 can tomatoes.\n</post-text>"),
  ]);
});

test("the calls are given the attempt's deadline, and Gemini's a timeout of its own", async () => {
  const generate = vi
    .spyOn(ai.models, "generateContent")
    .mockResolvedValue(answer(JSON.stringify(recipe)));
  const deadline = new AbortController().signal;

  await extract(youtube, deadline);

  expect(readVideoInfo).toHaveBeenCalledWith(youtube.url, deadline);
  const config = generate.mock.calls[0]?.[0].config;
  expect(config?.abortSignal).toBe(deadline);
  expect(config?.httpOptions?.timeout).toBe(120_000);
});

test("a video over 3 minutes isn't sent, and isn't tried again", async () => {
  vi.mocked(readVideoInfo).mockResolvedValue({ seconds: 181, caption: "" });
  const generate = vi.spyOn(ai.models, "generateContent");

  await expect(extract(youtube, noDeadline)).rejects.toThrow(new NoRetryError(TOO_LONG));
  expect(generate).not.toHaveBeenCalled();
});

test("a video whose length isn't known is sent", async () => {
  vi.mocked(readVideoInfo).mockResolvedValue({ caption: "" });
  const generate = vi
    .spyOn(ai.models, "generateContent")
    .mockResolvedValue(answer(JSON.stringify(recipe)));

  await extract(youtube, noDeadline);

  expect(generate).toHaveBeenCalled();
});

test("a video that isn't a recipe isn't tried again", async () => {
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(
    answer(JSON.stringify({ ...recipe, isRecipe: false })),
  );

  await expect(extract(youtube, noDeadline)).rejects.toThrow(new NoRetryError(NOT_A_RECIPE));
});

test("an empty answer is a failed attempt", async () => {
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer(""));

  await expect(extract(youtube, noDeadline)).rejects.toThrow("Gemini gave no answer");
});

test("an answer cut off mid-JSON is a failed attempt", async () => {
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer('{"title": "Shaksh'));

  await expect(extract(youtube, noDeadline)).rejects.toThrow(SyntaxError);
});

test("an Instagram link isn't sent: it needs a download first (M6)", async () => {
  const generate = vi.spyOn(ai.models, "generateContent");
  const reel: ImportDocument["input"] = {
    type: "link",
    url: "https://www.instagram.com/reel/abc/",
    platform: "instagram",
  };

  await expect(extract(reel, noDeadline)).rejects.toThrow("instagram links come in M6.");
  expect(generate).not.toHaveBeenCalled();
});
