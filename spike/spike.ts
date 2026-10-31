// M0 spike (design §4.5): which links can we turn into recipes?
// Not app code: one file, run by hand, one link at a time. Results go to spike/out/.
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";
import { FileState, GoogleGenAI, type Part } from "@google/genai";

const run = promisify(execFile);
const ai = new GoogleGenAI({}); // reads GEMINI_API_KEY from ../.env

const MODEL = "gemini-3.5-flash";
const MAX_VIDEO_SECONDS = 180; // design §1: videos ≤ 3 minutes
const OUT_DIR = `${import.meta.dirname}/out`;
// Instagram often wants a logged-in session; e.g. YTDLP_BROWSER=chrome reuses Chrome's cookies.
const COOKIE_ARGS = process.env.YTDLP_BROWSER
  ? ["--cookies-from-browser", process.env.YTDLP_BROWSER]
  : [];

// The fixed tag lists from design §7, as "facet:value" strings.
const FACETS = {
  cuisine: [
    "italian",
    "asian",
    "middle-eastern",
    "mexican",
    "american",
    "french",
    "indian",
    "mediterranean",
    "other",
  ],
  meal: ["breakfast", "lunch", "dinner", "snack", "dessert", "drink"],
  diet: [
    "vegetarian",
    "vegan",
    "gluten-free",
    "dairy-free",
    "kosher-dairy",
    "kosher-meat",
    "parve",
  ],
  flavor: ["sweet", "savory", "spicy", "sour", "smoky", "fresh"],
  fit: [
    "quick",
    "weeknight",
    "meal-prep",
    "party",
    "kids",
    "healthy",
    "comfort",
  ],
};
const TAGS = Object.entries(FACETS).flatMap(([facet, values]) =>
  values.map((v) => `${facet}:${v}`),
);

// A plain JSON schema is enough for the spike; the app will generate it from Zod (design §9).
const RECIPE_SCHEMA = {
  type: "object",
  properties: {
    isRecipe: { type: "boolean" },
    title: { type: "string" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "string" },
          unit: { type: "string" },
        },
        required: ["name"],
      },
    },
    steps: { type: "array", items: { type: "string" } },
    servings: { type: "number" },
    prepMinutes: { type: "number" },
    cookMinutes: { type: "number" },
    tags: { type: "array", items: { type: "string", enum: TAGS } },
    nutritionPerServing: {
      type: "object",
      properties: {
        calories: { type: "number" },
        proteinG: { type: "number" },
        carbsG: { type: "number" },
        fatG: { type: "number" },
      },
      required: ["calories", "proteinG", "carbsG", "fatG"],
    },
  },
  required: ["isRecipe", "title", "ingredients", "steps", "tags"],
};

const PROMPT = `Extract the recipe shown in this video.
Give the title, the ingredients with quantities and units, the steps in order, the servings and
the prep and cook times. Pick tags only from the allowed list. Estimate nutrition per serving.
Use the caption, the speech and the text on screen. Leave out anything you can't tell rather
than guessing. If the video is not a recipe, set isRecipe to false.`;

type Platform = "youtube" | "instagram" | "facebook";

type Result = {
  url: string;
  platform: Platform | "unknown";
  videoSeconds?: number;
  outcome: "recipe" | "not a recipe" | "failed";
  error?: string;
  title?: string;
  ingredients?: number;
  steps?: number;
  tags?: number;
  tookSeconds: number;
};

// Exact host or a subdomain, so "notyoutube.com" doesn't count.
function isHost(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

function detectPlatform(url: string): Platform | "unknown" {
  if (!URL.canParse(url)) return "unknown";
  const host = new URL(url).hostname;
  if (isHost(host, "youtube.com") || host === "youtu.be") return "youtube";
  if (isHost(host, "instagram.com")) return "instagram";
  if (isHost(host, "facebook.com") || host === "fb.watch") return "facebook";
  return "unknown";
}

// --playlist-items 1: a carousel or playlist link would otherwise give several videos.
// The timeout stops one hung link from stalling the whole run.
function ytDlp(args: string[]) {
  return run(
    "yt-dlp",
    [...COOKIE_ARGS, "--no-warnings", "--playlist-items", "1", ...args],
    { timeout: 120_000 },
  );
}

async function readVideoSeconds(url: string): Promise<number> {
  const { stdout } = await ytDlp(["--print", "duration", url]);
  const seconds = Number(stdout.trim());
  if (!Number.isFinite(seconds)) throw new Error("yt-dlp gave no video length");
  return seconds;
}

// Saves as <base>.mp4: --remux-video turns other containers into mp4 without re-encoding.
async function downloadVideo(url: string, base: string) {
  await ytDlp(["--remux-video", "mp4", "-o", `${base}.%(ext)s`, url]);
}

async function askGemini(video: Part): Promise<Record<string, unknown>> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [video, PROMPT],
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RECIPE_SCHEMA,
    },
  });
  if (!response.text) throw new Error("Gemini returned no text");
  return JSON.parse(response.text);
}

// Uploads to the Gemini Files API and waits until Gemini has processed the video.
async function uploadVideo(path: string) {
  let file = await ai.files.upload({
    file: path,
    config: { mimeType: "video/mp4" },
  });
  const name = file.name;
  if (!name) throw new Error("Gemini file has no name");
  while (file.state === FileState.PROCESSING) {
    await sleep(2000);
    file = await ai.files.get({ name });
  }
  if (file.state !== FileState.ACTIVE || !file.uri)
    throw new Error(`Gemini file is ${file.state}`);
  return file;
}

// Instagram / Facebook: download, upload, ask. Media is deleted in finally (design §4.1).
async function extractFromDownload(url: string, name: string) {
  const base = `${OUT_DIR}/tmp/${name}`;
  const path = `${base}.mp4`;
  let geminiFileName: string | undefined;
  try {
    await downloadVideo(url, base);
    const file = await uploadVideo(path);
    geminiFileName = file.name;
    return await askGemini({
      fileData: { fileUri: file.uri, mimeType: "video/mp4" },
    });
  } finally {
    await rm(path, { force: true });
    // A failed delete must not hide the real error; Gemini deletes files after 48h anyway.
    if (geminiFileName)
      await ai.files.delete({ name: geminiFileName }).catch(() => {});
  }
}

function count(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

// yt-dlp's reason ("ERROR: ... login required") is the last line of its stderr.
function lastLine(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.trim().split("\n").at(-1) ?? text;
}

async function tryLink(url: string, index: number): Promise<Result> {
  const started = Date.now();
  const platform = detectPlatform(url);
  const result: Result = { url, platform, outcome: "failed", tookSeconds: 0 };
  const name = `${index + 1}-${platform}`;
  try {
    if (platform === "unknown")
      throw new Error("Not an Instagram, Facebook or YouTube link");
    // The length check comes before any download or Gemini call (design §1: ≤ 3 minutes).
    result.videoSeconds = await readVideoSeconds(url);
    if (result.videoSeconds > MAX_VIDEO_SECONDS)
      throw new Error(`Video is ${result.videoSeconds}s, over the limit`);
    // YouTube: Gemini watches the public video from its URL (design §4.1).
    const recipe =
      platform === "youtube"
        ? await askGemini({ fileData: { fileUri: url } })
        : await extractFromDownload(url, name);
    await writeFile(`${OUT_DIR}/${name}.json`, JSON.stringify(recipe, null, 2));
    result.outcome = recipe.isRecipe ? "recipe" : "not a recipe";
    result.title = typeof recipe.title === "string" ? recipe.title : "";
    result.ingredients = count(recipe.ingredients);
    result.steps = count(recipe.steps);
    result.tags = count(recipe.tags);
  } catch (error) {
    result.error = lastLine(error);
  }
  result.tookSeconds = Math.round((Date.now() - started) / 1000);
  return result;
}

function toMarkdown(results: Result[]): string {
  const header =
    "| # | Platform | Link | Video s | Outcome | Title | Ingredients | Steps | Tags | Took s | Error |\n" +
    "|---|---|---|---|---|---|---|---|---|---|---|\n";
  const rows = results.map((r, i) =>
    [
      i + 1,
      r.platform,
      r.url,
      r.videoSeconds,
      r.outcome,
      r.title,
      r.ingredients,
      r.steps,
      r.tags,
      r.tookSeconds,
      r.error,
    ]
      .map((cell) => String(cell ?? "").replaceAll("|", "\\|"))
      .join(" | "),
  );
  return header + rows.map((row) => `| ${row} |`).join("\n") + "\n";
}

const links = (await readFile(`${import.meta.dirname}/links.txt`, "utf8"))
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));

await mkdir(`${OUT_DIR}/tmp`, { recursive: true });
const results: Result[] = [];
// One at a time on purpose: easy to follow in the log and gentle on Gemini rate limits.
for (const [index, url] of links.entries()) {
  const result = await tryLink(url, index);
  console.log(
    `${index + 1}/${links.length} ${result.platform} ${result.outcome} ${result.error ?? ""}`,
  );
  results.push(result);
}
await writeFile(`${OUT_DIR}/results.md`, toMarkdown(results));
console.log(`Wrote ${OUT_DIR}/results.md`);
