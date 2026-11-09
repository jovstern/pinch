import { FileState, GenerateContentResponse, GoogleGenAI } from "@google/genai";
import { Binary } from "mongodb";
import { pino } from "pino";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { ImportDocument } from "../db/imports.ts";
import { GEMINI_MODEL, geminiExtract, NOT_A_RECIPE, TOO_LONG } from "./geminiExtract.ts";
import { makeThumbnail } from "./thumbnail.ts";
import { downloadVideo, measureSeconds, readVideoInfo } from "./videoInfo.ts";
import { NoRetryError } from "./workLoop.ts";

// yt-dlp is replaced too, and the picture's fetch: no test reads a real post. The rest of
// thumbnail.ts (shrink) is the real one.
vi.mock("./videoInfo.ts");
vi.mock("./thumbnail.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./thumbnail.ts")>()),
  makeThumbnail: vi.fn(),
}));

// A real client with a made-up key; its one call is replaced, so nothing reaches Gemini.
const ai = new GoogleGenAI({ apiKey: "test" });
const extract = geminiExtract(ai);
const noDeadline = new AbortController().signal;
const noStep = () => Promise.resolve();
const noThumbnail = () => Promise.resolve();
// An attempt that keeps nothing and logs nothing; a test replaces what it checks.
const quiet = { setStep: noStep, setThumbnail: noThumbnail, log: pino({ level: "silent" }) };
const thumbnail = { webp: new Binary(Buffer.from("webp")), width: 400, height: 500 };

beforeEach(() => {
  // restoreAllMocks doesn't reset an automocked module's own: each test starts with none.
  vi.mocked(makeThumbnail).mockReset();
  vi.mocked(downloadVideo).mockReset();
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

  expect(await extract(youtube, noDeadline, quiet)).toEqual(recipe);

  const request = generate.mock.calls[0]?.[0];
  expect(request?.model).toBe(GEMINI_MODEL);
  expect(request?.contents).toContainEqual({ fileData: { fileUri: youtube.url } });
  expect(JSON.stringify(request?.contents)).toContain("2 eggs, 1 can tomatoes");
  // The tags are listed, so the model can only pick from them.
  expect(JSON.stringify(request?.config?.responseJsonSchema)).toContain('"meal:dinner"');
  // And the nutrition estimate, which only the model gives (D14).
  expect(JSON.stringify(request?.config?.responseJsonSchema)).toContain('"nutritionPerServing"');
});

test("a link is fetched, then analyzed; a text is only analyzed", async () => {
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer(JSON.stringify(recipe)));
  const steps: string[] = [];
  const setStep = (step: string) => {
    steps.push(step);
    return Promise.resolve();
  };

  await extract(youtube, noDeadline, { ...quiet, setStep });
  await extract({ type: "text", text: "Shakshuka: 4 eggs, 1 can tomatoes." }, noDeadline, {
    ...quiet,
    setStep,
  });

  expect(steps).toEqual(["fetching", "analyzing", "analyzing"]);
});

test("pasted text is sent alone, fenced as data: no video, so no yt-dlp", async () => {
  const generate = vi
    .spyOn(ai.models, "generateContent")
    .mockResolvedValue(answer(JSON.stringify(recipe)));

  await extract({ type: "text", text: "Shakshuka: 4 eggs, 1 can tomatoes." }, noDeadline, quiet);

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

  await extract(youtube, deadline, quiet);

  expect(readVideoInfo).toHaveBeenCalledWith(youtube.url, deadline);
  const config = generate.mock.calls[0]?.[0].config;
  expect(config?.abortSignal).toBe(deadline);
  expect(config?.httpOptions?.timeout).toBe(120_000);
});

test("a video over 3 minutes isn't sent, and isn't tried again", async () => {
  vi.mocked(readVideoInfo).mockResolvedValue({ seconds: 181, caption: "" });
  const generate = vi.spyOn(ai.models, "generateContent");

  await expect(extract(youtube, noDeadline, quiet)).rejects.toThrow(new NoRetryError(TOO_LONG));
  expect(generate).not.toHaveBeenCalled();
});

test("a video whose length isn't known is sent", async () => {
  vi.mocked(readVideoInfo).mockResolvedValue({ caption: "" });
  const generate = vi
    .spyOn(ai.models, "generateContent")
    .mockResolvedValue(answer(JSON.stringify(recipe)));

  await extract(youtube, noDeadline, quiet);

  expect(generate).toHaveBeenCalled();
});

test("a video that isn't a recipe isn't tried again", async () => {
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(
    answer(JSON.stringify({ ...recipe, isRecipe: false })),
  );

  await expect(extract(youtube, noDeadline, quiet)).rejects.toThrow(new NoRetryError(NOT_A_RECIPE));
});

test("an empty answer is a failed attempt", async () => {
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer(""));

  await expect(extract(youtube, noDeadline, quiet)).rejects.toThrow("Gemini gave no answer");
});

test("an answer cut off mid-JSON is a failed attempt", async () => {
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer('{"title": "Shaksh'));

  await expect(extract(youtube, noDeadline, quiet)).rejects.toThrow(SyntaxError);
});

const reel: ImportDocument["input"] = {
  type: "link",
  url: "https://www.instagram.com/reel/abc/",
  platform: "instagram",
};

// yt-dlp downloads a reel into the folder it's given, with the length the platform says (none
// for Instagram). Returns the folder, to check it's deleted.
function downloadsReel(seconds?: number) {
  const folder = { path: "" };
  vi.mocked(downloadVideo).mockImplementation((_url, dir) => {
    folder.path = dir;
    writeFileSync(join(dir, "video.mp4"), "a video");
    return Promise.resolve({ seconds, caption: "2 eggs", path: join(dir, "video.mp4") });
  });
  return folder;
}

// The Files API takes the video, in this state at first (ready at once, unless said).
function filesApi(state = FileState.ACTIVE) {
  const file = {
    name: "files/reel",
    uri: "https://gemini/files/reel",
    mimeType: "video/mp4",
  };
  const upload = vi.spyOn(ai.files, "upload").mockResolvedValue({ ...file, state });
  const get = vi.spyOn(ai.files, "get").mockResolvedValue({ ...file, state: FileState.ACTIVE });
  const remove = vi.spyOn(ai.files, "delete").mockResolvedValue({});
  return { upload, get, remove };
}

test("an Instagram reel is downloaded, measured, uploaded and asked about; then both copies are deleted", async () => {
  const folder = downloadsReel();
  vi.mocked(measureSeconds).mockResolvedValue(30);
  const { upload, remove } = filesApi();
  const generate = vi
    .spyOn(ai.models, "generateContent")
    .mockResolvedValue(answer(JSON.stringify(recipe)));

  expect(await extract(reel, noDeadline, quiet)).toEqual(recipe);

  expect(upload.mock.calls[0]?.[0].file).toBe(join(folder.path, "video.mp4"));
  const contents = generate.mock.calls[0]?.[0].contents;
  expect(contents).toContainEqual({
    fileData: { fileUri: "https://gemini/files/reel", mimeType: "video/mp4" },
  });
  expect(JSON.stringify(contents)).toContain("2 eggs");
  expect(remove).toHaveBeenCalledWith({ name: "files/reel" });
  expect(existsSync(folder.path)).toBe(false);
});

test("a Facebook reel's length is the one Facebook gives: nothing to measure", async () => {
  downloadsReel(40);
  filesApi();
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer(JSON.stringify(recipe)));

  await extract({ ...reel, platform: "facebook" }, noDeadline, quiet);

  expect(measureSeconds).not.toHaveBeenCalled();
});

test("a video Gemini is still processing is asked about once it's ready", async () => {
  downloadsReel(30);
  const { get } = filesApi(FileState.PROCESSING);
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer(JSON.stringify(recipe)));

  // Checked again after 2 s: the test waits that long.
  expect(await extract(reel, noDeadline, quiet)).toEqual(recipe);

  expect(get).toHaveBeenCalledWith(expect.objectContaining({ name: "files/reel" }));
});

test("a video Gemini can't read is a failed attempt, and the upload is still deleted", async () => {
  downloadsReel(30);
  const { remove } = filesApi(FileState.FAILED);

  await expect(extract(reel, noDeadline, quiet)).rejects.toThrow("Gemini couldn't read");

  expect(remove).toHaveBeenCalledWith({ name: "files/reel" });
});

test("a reel over 3 minutes, measured once it's here, isn't uploaded, and isn't tried again", async () => {
  const folder = downloadsReel();
  vi.mocked(measureSeconds).mockResolvedValue(200);
  const { upload } = filesApi();

  await expect(extract(reel, noDeadline, quiet)).rejects.toThrow(new NoRetryError(TOO_LONG));

  expect(upload).not.toHaveBeenCalled();
  expect(existsSync(folder.path)).toBe(false);
});

test("a post with no video (a photo post) is read from its caption alone", async () => {
  vi.mocked(downloadVideo).mockResolvedValue({ caption: "Shakshuka: 4 eggs" });
  const { upload } = filesApi();
  const generate = vi
    .spyOn(ai.models, "generateContent")
    .mockResolvedValue(answer(JSON.stringify(recipe)));

  expect(await extract(reel, noDeadline, quiet)).toEqual(recipe);

  expect(upload).not.toHaveBeenCalled();
  expect(generate.mock.calls[0]?.[0].contents).toEqual([
    expect.stringContaining("<post-text>\nShakshuka: 4 eggs\n</post-text>"),
  ]);
});

test("the uploaded video is deleted even when Gemini fails", async () => {
  downloadsReel(30);
  const { remove } = filesApi();
  vi.spyOn(ai.models, "generateContent").mockRejectedValue(new Error("Gemini is down."));

  await expect(extract(reel, noDeadline, quiet)).rejects.toThrow("Gemini is down.");

  expect(remove).toHaveBeenCalledWith({ name: "files/reel" });
});

test("a YouTube video's picture is made small and saved on the import", async () => {
  vi.mocked(readVideoInfo).mockResolvedValue({
    caption: "",
    thumbnailUrl: "https://i.ytimg.com/vi/abc/hq.jpg",
  });
  vi.mocked(makeThumbnail).mockResolvedValue(thumbnail);
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer(JSON.stringify(recipe)));
  const setThumbnail = vi.fn(() => Promise.resolve());

  await extract(youtube, noDeadline, { ...quiet, setThumbnail });

  expect(makeThumbnail).toHaveBeenCalledWith("https://i.ytimg.com/vi/abc/hq.jpg", noDeadline);
  expect(setThumbnail).toHaveBeenCalledWith(thumbnail);
});

test("when the picture can't be made, nothing is saved and the recipe still is", async () => {
  vi.mocked(makeThumbnail).mockResolvedValue(undefined);
  vi.mocked(downloadVideo).mockResolvedValue({
    caption: "Shakshuka: 4 eggs",
    thumbnailUrl: "https://instagram/cover.jpg",
  });
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer(JSON.stringify(recipe)));
  const setThumbnail = vi.fn(() => Promise.resolve());

  expect(await extract(reel, noDeadline, { ...quiet, setThumbnail })).toEqual(recipe);

  expect(setThumbnail).not.toHaveBeenCalled();
});

test("a post with no picture fetches none", async () => {
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(answer(JSON.stringify(recipe)));

  await extract(youtube, noDeadline, quiet);

  expect(makeThumbnail).not.toHaveBeenCalled();
});

test("screenshots are sent as images, with no yt-dlp, and the first is the picture", async () => {
  const image = await sharp({
    create: { width: 800, height: 1600, channels: 3, background: "#fff" },
  })
    .jpeg()
    .toBuffer();
  const generate = vi
    .spyOn(ai.models, "generateContent")
    .mockResolvedValue(answer(JSON.stringify(recipe)));
  const setThumbnail = vi.fn(() => Promise.resolve());

  await extract(
    { type: "images", count: 2, images: [new Binary(image), new Binary(image)] },
    noDeadline,
    { ...quiet, setThumbnail },
  );

  expect(readVideoInfo).not.toHaveBeenCalled();
  const contents = generate.mock.calls[0]?.[0].contents;
  expect(contents).toContainEqual({
    inlineData: { mimeType: "image/jpeg", data: image.toString("base64") },
  });
  expect(contents).toHaveLength(3);
  expect(setThumbnail).toHaveBeenCalledWith(expect.objectContaining({ width: 250, height: 500 }));
});

test("each answer's time and tokens are logged", async () => {
  const response = answer(JSON.stringify(recipe));
  response.usageMetadata = {
    promptTokenCount: 1200,
    candidatesTokenCount: 300,
    thoughtsTokenCount: 800,
  };
  vi.spyOn(ai.models, "generateContent").mockResolvedValue(response);
  const lines: string[] = [];
  const log = pino({ level: "info" }, { write: (line: string) => lines.push(line) });

  await extract(youtube, noDeadline, { ...quiet, log });

  const line = lines.find((text) => text.includes("gemini answered")) ?? "{}";
  expect(JSON.parse(line)).toMatchObject({
    model: GEMINI_MODEL,
    ms: expect.any(Number) as unknown,
    inputTokens: 1200,
    outputTokens: 300,
    thinkingTokens: 800,
  });
});
