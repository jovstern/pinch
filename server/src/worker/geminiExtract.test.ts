import { GenerateContentResponse, GoogleGenAI } from "@google/genai";
import { afterEach, expect, test, vi } from "vitest";
import type { ImportDocument } from "../db/imports.ts";
import { GEMINI_MODEL, geminiExtract } from "./geminiExtract.ts";

// A real client with a made-up key; its one call is replaced, so nothing reaches Gemini.
const ai = new GoogleGenAI({ apiKey: "test" });
const extract = geminiExtract(ai);
const noDeadline = new AbortController().signal;

afterEach(() => {
  vi.restoreAllMocks();
});

const youtube: ImportDocument["input"] = {
  type: "link",
  url: "https://www.youtube.com/shorts/abc123",
  platform: "youtube",
};

// What Gemini answers: the JSON text of its one candidate.
function answer(text: string) {
  const response = new GenerateContentResponse();
  response.candidates = [{ content: { parts: [{ text }] } }];
  return response;
}

test("a YouTube link is sent to Gemini with the recipe's schema, and its JSON comes back", async () => {
  const draft = { title: "Shakshuka", ingredients: [{ name: "eggs" }], steps: ["Crack them."] };
  const generate = vi
    .spyOn(ai.models, "generateContent")
    .mockResolvedValue(answer(JSON.stringify(draft)));

  expect(await extract(youtube, noDeadline)).toEqual(draft);

  const request = generate.mock.calls[0]?.[0];
  expect(request?.model).toBe(GEMINI_MODEL);
  expect(request?.contents).toContainEqual({ fileData: { fileUri: youtube.url } });
  // The tags are listed, so the model can only pick from them.
  expect(JSON.stringify(request?.config?.responseJsonSchema)).toContain('"meal:dinner"');
});

test("the call stops at the attempt's deadline", async () => {
  const generate = vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer("{}"));
  const deadline = new AbortController();

  await extract(youtube, deadline.signal);
  deadline.abort();

  expect(generate.mock.calls[0]?.[0].config?.abortSignal?.aborted).toBe(true);
});

test("an empty answer is a failed attempt", async () => {
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer(""));

  await expect(extract(youtube, noDeadline)).rejects.toThrow("Gemini gave no answer.");
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
