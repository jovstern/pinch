import { ApiError } from "../../lib/api.ts";

// What a failed Log in or Sign up says (design §8.3). A 400's messages go on their fields (as
// TanStack Form reads { fields }); anything else is one message above the button, and Sign up's
// 409 comes with a link to Log in.
export type SubmitError = { message: string; logIn?: boolean };

export function submitError(error: unknown): { fields: Record<string, string> } | SubmitError {
  if (error instanceof ApiError) {
    if (error.status === 400 && Object.keys(error.fields).length > 0) {
      return { fields: error.fields };
    }
    // The same for a wrong email as for a wrong password: the API doesn't say which (§8.3).
    if (error.status === 401) return { message: "That email and password don't match." };
    if (error.status === 409)
      return { message: "An account already uses this email.", logIn: true };
    if (error.status === 429) return { message: "Too many tries. Wait a minute and try again." };
  }
  // fetch fails with a TypeError when there's no answer at all; anything else (a 500, a 400
  // without fields) is the server's.
  if (error instanceof TypeError) return { message: "We couldn't reach Pinch. Try again." };
  return { message: "Something went wrong. Try again." };
}
