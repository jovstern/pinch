import { z } from "zod";
import { RecipeInputSchema } from "./recipe.ts";

export const PlatformSchema = z.enum(["instagram", "facebook", "youtube"]);
export type Platform = z.infer<typeof PlatformSchema>;

export const linkMessage = "Paste a link to an Instagram, Facebook or YouTube post.";

// The body of POST /api/imports: a link to a post. Text and screenshots come in M6. Which site
// it's from, the API checks (routes/imports.ts).
export const ImportInputSchema = z.object({
  url: z
    .string(linkMessage)
    .trim()
    .max(2000, "Keep the link under 2000 characters.")
    .pipe(z.url({ protocol: /^https?$/, error: linkMessage })),
});

// An import as the API sends it (design §4.2, §6). The worker's own fields (the lease, when to
// try next, when it expires) stay on the server.
export const ImportSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "processing", "ready", "failed"]),
  // How far a processing import has got, to show progress.
  step: z.enum(["fetching", "analyzing"]).optional(),
  input: z.object({ type: z.literal("link"), url: z.url(), platform: PlatformSchema }),
  attempts: z.int(),
  // Why it failed, in words the user can read.
  error: z.string().optional(),
  // The recipe the worker made, for the user to review (design D1).
  draft: RecipeInputSchema.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

// GET /api/imports: my imports, newest first. Done ones are deleted, so the list stays short.
export const ImportListSchema = z.object({ items: z.array(ImportSchema) });

export type ImportInput = z.infer<typeof ImportInputSchema>;
export type Import = z.infer<typeof ImportSchema>;
export type ImportList = z.infer<typeof ImportListSchema>;
