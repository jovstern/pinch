import { z } from "zod";
import { RecipeDraftSchema, ThumbnailSchema } from "./recipe.ts";

export const PlatformSchema = z.enum(["instagram", "facebook", "youtube"]);
export type Platform = z.infer<typeof PlatformSchema>;

// How far a processing import has got, to show progress (design §4.2).
export const ImportStepSchema = z.enum(["fetching", "analyzing"]);
export type ImportStep = z.infer<typeof ImportStepSchema>;

export const linkMessage = "Paste a link to an Instagram, Facebook or YouTube post.";

// Imports (links or texts) a user may send (or retry) a day: each costs Gemini calls (design §1).
// The API answers 429 with this message past it, and the client shows it.
export const DAILY_IMPORT_CAP = 20;
export const dailyLimitMessage = `You've sent ${String(DAILY_IMPORT_CAP)} imports today. Try again tomorrow.`;

export const textMessage = "Paste more of the recipe: a line or two at least.";

// Screenshots of a post, sent when neither its link nor its text will do (design §1): a few
// pictures of the recipe, sent as a form (POST /api/imports/screenshots), not JSON.
export const MAX_SCREENSHOTS = 4;
export const MAX_SCREENSHOT_BYTES = 10_000_000;
export const screenshotsMessage = `Add 1 to ${String(MAX_SCREENSHOTS)} screenshots: PNG, JPEG or WebP, up to 10 MB each.`;

// The body of POST /api/imports (design §4.1, §8): a link to a post on one of the platforms, by
// its host ("www." and "m." are the same site), or the post's text, pasted when its link can't
// be read (§1). The type says which, so each field has its own message. Screenshots have their
// own route: they're sent as a form.
export const ImportInputSchema = z.discriminatedUnion(
  "type",
  [
    z.object({
      type: z.literal("link"),
      url: z
        .string(linkMessage)
        .trim()
        // An empty box is one word, so a link: but it may have been for either.
        .min(1, "Paste a link or the recipe's text.")
        .max(2000, "Keep the link under 2000 characters.")
        .pipe(
          z.url({
            protocol: /^https?$/,
            hostname:
              /^((www\.|m\.)?(instagram\.com|facebook\.com|youtube\.com)|youtu\.be|fb\.watch)$/,
            error: linkMessage,
          }),
        ),
    }),
    z.object({
      type: z.literal("text"),
      text: z
        .string(textMessage)
        .trim()
        .min(20, textMessage)
        .max(10_000, "Keep the text under 10,000 characters."),
    }),
  ],
  { error: "Send a link or a text." },
);

// An import as the API sends it (design §4.2, §6). The worker's own fields (the lease, when to
// try next, when it expires) stay on the server.
export const ImportSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "processing", "ready", "failed"]),
  step: ImportStepSchema.optional(),
  // As it was sent, and a link's platform. http(s) only, as a recipe's source: the client
  // renders it as a link.
  input: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("link"),
      url: z.url({ protocol: /^https?$/ }),
      platform: PlatformSchema,
    }),
    z.object({ type: z.literal("text"), text: z.string() }),
    // How many; the images themselves stay on the server.
    z.object({ type: z.literal("images"), count: z.int() }),
  ]),
  attempts: z.int(),
  // No worker has taken it, long after it was due: none is running (design §4.3). The client
  // then stops saying it's being worked on.
  stalled: z.boolean(),
  // Why it failed, in words the user can read.
  error: z.string().optional(),
  // On a failed one: true when no retry can fix it (not a recipe, too long: design D23), so
  // Retry isn't offered.
  noRetry: z.boolean().optional(),
  // The recipe the worker made, for the user to review (design D1).
  draft: RecipeDraftSchema.optional(),
  // The draft's picture, served by GET /api/imports/:id/thumbnail (design §5).
  thumbnail: ThumbnailSchema.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// GET /api/imports: my imports, newest first. Done ones are deleted, so the list stays short.
export const ImportListSchema = z.object({ items: z.array(ImportSchema) });

export type ImportInput = z.infer<typeof ImportInputSchema>;
export type Import = z.infer<typeof ImportSchema>;
export type ImportList = z.infer<typeof ImportListSchema>;
