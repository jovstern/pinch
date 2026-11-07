import { GoogleGenAI } from "@google/genai";
import { RecipeInputSchema } from "@pinch/shared";
import { z } from "zod";
import type { Extract } from "./workLoop.ts";

// The current Gemini Flash model, the one the spike was run with (design §9, M0).
export const GEMINI_MODEL = "gemini-3.5-flash";

// Each call has its own timeout inside the attempt's deadline (§4.3): in the spike one call hung
// for 27 minutes. The other calls of an attempt (yt-dlp, next) need time too. The SDK doesn't
// retry unless asked, so a call is one request, and the worker's retries are the only ones.
const GEMINI_TIMEOUT_MS = 120_000;

// The answer's shape, made from the schema the draft is then checked with, so the two can't
// drift apart (§9). The input side: what the model writes, before the schema trims it and turns
// "" into "not set". Without maxItems: Gemini refuses a schema that has it (400 "invalid
// argument", tried when coding); Zod still checks those limits on the answer.
const responseJsonSchema = z.toJSONSchema(RecipeInputSchema, {
  io: "input",
  override: ({ jsonSchema }) => {
    delete jsonSchema.maxItems;
  },
});

const PROMPT = `Extract the recipe shown in this video: the title, a short description, the
ingredients with quantities and units, the steps in order, the servings, and the prep and cook
times in minutes, and tags from the allowed list. Use the speech and the text on screen. Write
the recipe in the language the video is in; tags are codes, so keep them as they are. Leave out
anything you can't tell rather than guessing.`;

// The one place that knows about Gemini (§9): the worker hands it an import's input and gets a
// draft back, which it checks with Zod as it would any other.
export function geminiExtract(ai: GoogleGenAI): Extract {
  return async (input, signal) => {
    // Instagram and Facebook are downloaded and uploaded first: M6.
    if (input.platform !== "youtube") throw new Error(`${input.platform} links come in M6.`);
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      // Gemini watches a public YouTube video from its link (§4.1).
      contents: [{ fileData: { fileUri: input.url } }, PROMPT],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
        abortSignal: signal,
        httpOptions: { timeout: GEMINI_TIMEOUT_MS },
      },
    });
    // Why it's empty (blocked, too long) is in the worker's log.
    if (!response.text) {
      throw new Error(`Gemini gave no answer: ${response.candidates?.[0]?.finishReason ?? "?"}`);
    }
    // Unknown until runImport checks it with Zod.
    return JSON.parse(response.text) as unknown;
  };
}
