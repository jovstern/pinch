import { z } from "zod";

// An optional text field. Forms send "" for a blank input and models often answer "", so an
// empty string means "not set" (design §9): one meaning, stored one way.
function optionalText(max: number, tooLong: string) {
  return z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((text) => (text === "" ? undefined : text))
    .optional();
}

function optionalWholeNumber(min: number, max: number, outOfRange: string) {
  return z.int("Enter a whole number.").min(min, outOfRange).max(max, outOfRange).optional();
}

export const IngredientSchema = z.object({
  name: z.string().trim().min(1, "Name the ingredient.").max(200, "Keep it under 200 characters."),
  // Text, not a number: recipes say "1/2", "2-3" or "a pinch".
  quantity: optionalText(50, "Keep it under 50 characters."),
  unit: optionalText(50, "Keep it under 50 characters."),
  note: optionalText(200, "Keep it under 200 characters."),
});

// What the user writes: the body of POST /api/recipes (design §6). Every limit has a message
// the form can show (§8.1). Tags come with Find (M3), nutrition with Gemini (M5).
export const RecipeInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the recipe a title.")
    .max(200, "Keep the title under 200 characters."),
  description: optionalText(2000, "Keep the description under 2000 characters."),
  ingredients: z
    .array(IngredientSchema)
    .min(1, "Add at least one ingredient.")
    .max(100, "A recipe can have up to 100 ingredients."),
  steps: z
    .array(
      z
        .string()
        .trim()
        .min(1, "A step can't be empty.")
        .max(2000, "Keep each step under 2000 characters."),
    )
    .min(1, "Add at least one step.")
    .max(100, "A recipe can have up to 100 steps."),
  servings: optionalWholeNumber(1, 100, "Servings must be between 1 and 100."),
  prepMinutes: optionalWholeNumber(0, 1440, "Prep time must be between 0 and 1440 minutes."),
  cookMinutes: optionalWholeNumber(0, 1440, "Cook time must be between 0 and 1440 minutes."),
});

export const SourceSchema = z.object({
  type: z.enum(["instagram", "facebook", "youtube", "text", "image", "manual"]),
  // http(s) only: the client renders it as a link, and a javascript: URL would run code.
  url: z.url({ protocol: /^https?$/ }).optional(),
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
