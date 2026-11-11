import { MeSchema, type LoginInput, type Me, type SignupInput } from "@pinch/shared";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { ApiError, getJson, sendJson } from "../../lib/api.ts";

// Who is signed in (design §8.3): the user, or null when nobody is (the API's 401). index.html
// preloads it with the page, so it's in by the time the JS runs. Never stale: it only changes when
// the client signs in or out (setMe), or a 401 says the session has ended (SessionGate).
export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    try {
      return await getJson("/api/auth/me", MeSchema);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
      // index.html preloaded the queue too, and it got a 401 as well. Left unread, the browser
      // would hand that old answer to the queue's first request after Log in, whose 401 would
      // sign the user straight out again: it's read, and dropped, now.
      fetch("/api/imports").catch(() => undefined);
      return null;
    }
  },
  staleTime: Infinity,
});

// Signing in or out: everything cached was the last user's, so it goes, and the gate
// (SessionGate) takes the new user to their page, or the old one to Log in. The me query stays
// (only its value changes), as the gate is watching it.
export function setMe(queryClient: QueryClient, me: Me | null) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
  queryClient.setQueryData(meQuery.queryKey, me);
}

export function logIn(input: LoginInput) {
  return sendJson("POST", "/api/auth/login", input, MeSchema);
}

export function signUp(input: SignupInput) {
  return sendJson("POST", "/api/auth/signup", input, MeSchema);
}
