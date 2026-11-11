import type { Config } from "./config.ts";
import { GEMINI_MODEL, GEMINI_VERSION } from "./worker/geminiExtract.ts";

// Which model makes the answers, and their version, for each EXTRACTOR (design §4.6, D28). The
// worker keeps answers in the shared links cache by version, and the API looks there to make a hit
// free: both read it here, from the same EXTRACTOR, so they agree. The fake's has its own, so its
// answers never mix with Gemini's in a shared database.
export const EXTRACTION = {
  gemini: { model: GEMINI_MODEL, version: GEMINI_VERSION },
  fake: { model: "fake", version: "fake-1" },
} satisfies Record<Config["EXTRACTOR"], { model: string; version: string }>;
