import type { z } from "zod";

// One message per field, keyed by its path like "ingredients.0.name" (design §8.1): the API
// sends these in a 400, and the form shows the same ones before it sends anything. The first
// message wins, as it's the one the user should fix first.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  return Object.fromEntries(
    error.issues.toReversed().map((issue) => [issue.path.map(String).join("."), issue.message]),
  );
}
