import { z } from "zod";

export const IngredientSchema = z.object({
  name: z.string().trim().min(1, "Name the ingredient.").max(200),
  // Text, not a number: recipes say "1/2", "2-3" or "a pinch".
  quantity: z.string().trim().max(50).optional(),
  unit: z.string().trim().max(50).optional(),
  note: z.string().trim().max(200).optional(),
});

// What the user writes: the body of POST /api/recipes (design §6). Tags come with Find (M3),
// nutrition with Gemini (M5).
export const RecipeInputSchema = z.object({
  title: z.string().trim().min(1, "Give the recipe a title.").max(200),
  description: z.string().trim().max(2000).optional(),
  ingredients: z.array(IngredientSchema).min(1, "Add at least one ingredient.").max(100),
  steps: z
    .array(z.string().trim().min(1, "A step can't be empty.").max(2000))
    .min(1, "Add at least one step.")
    .max(100),
  servings: z.int().min(1).max(100).optional(),
  prepMinutes: z.int().min(0).max(1440).optional(),
  cookMinutes: z.int().min(0).max(1440).optional(),
});

export const SourceSchema = z.object({
  type: z.enum(["instagram", "facebook", "youtube", "text", "image", "manual"]),
  url: z.url().optional(),
});

// A recipe as the API sends it: the ids and dates are strings (mongodb.md).
export const RecipeSchema = RecipeInputSchema.extend({
  id: z.string(),
  source: SourceSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type RecipeInput = z.infer<typeof RecipeInputSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
