import {
  MeSchema,
  ProvidersSchema,
  type Language,
  type LoginInput,
  type Me,
  type MePatch,
  type SignupInput,
} from "@pinch/shared";
import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { needsReloadFor } from "../../i18n.ts";
import { getJson, post, sendJson } from "../../lib/api.ts";
import { reloadPage } from "../../lib/loadPage.ts";
import { dismissAllToasts } from "../../lib/toasts.tsx";

// Who is signed in (design §8.3): the user, or null when nobody is (the API's answer). index.html
// preloads it with the page, so it's in by the time the JS runs. Never stale: Log in, Sign up and
// Log out load a new page (loadPage), and a 401 mid-visit sets it (signedOutHere). Asked even
// offline ("always"), so a start without a connection shows SessionGate's error, not a blank page.
// On a new device the account's language may not be the page's: then the page reloads in it, and
// the query never settles, so SessionGate draws nothing before it does (design §16.1).
export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Me | null> => {
    const me = await getJson("/api/auth/me", MeSchema.nullable());
    if (!needsReloadFor(me)) return me;
    reloadPage();
    return new Promise(() => undefined);
  },
  staleTime: Infinity,
  networkMode: "always",
});

// A session that ended mid-visit (a 401: it expired, or the user logged out in another tab). That
// isn't a new page, so the client drops what was the user's itself: every cached query but me
// (the gate watches it, and goes to Log in as it turns null) and every toast.
export function signedOutHere(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "me" });
  queryClient.setQueryData(meQuery.queryKey, null);
  dismissAllToasts();
}

// Which ways to sign in the API offers besides a password (§8.3): Google only when it's configured,
// which can't change while the API runs. Asked only by Log in and Sign up.
export const providersQuery = queryOptions({
  queryKey: ["providers"],
  queryFn: () => getJson("/api/auth/providers", ProvidersSchema),
  staleTime: Infinity,
});

export function logIn(input: LoginInput) {
  return sendJson("POST", "/api/auth/login", input, MeSchema);
}

export function signUp(input: SignupInput) {
  return sendJson("POST", "/api/auth/signup", input, MeSchema);
}

export function changeLanguage(language: Language) {
  return sendJson("PATCH", "/api/auth/me", { language } satisfies MePatch, MeSchema);
}

export function logOut() {
  return post("/api/auth/logout");
}
