import { createHash } from "node:crypto";
import { LanguageSchema } from "@pinch/shared";
import express, { type Request } from "express";
import type { Db } from "mongodb";
import { z } from "zod";
import { countLoginTry, LOGIN_TRIES_PER_IP } from "../db/loginAttempts.ts";
import { newToken } from "../db/sessions.ts";
import { googleAccount } from "../db/users.ts";
import { authorizationUrl, type Google } from "../google.ts";
import { readCookie, startSession } from "../session.ts";

// Sign in with Google (design §8.3): GET /api/auth/google sends the browser to Google, and Google
// sends it back to /callback with a code. Both are page loads, not fetches, so every failure is a
// redirect to Log in, which says "Couldn't sign in with Google"; the reason in the address is ours,
// never Google's words.

// The flow's secrets, kept in the browser between the two requests: a cookie Google never sees,
// HttpOnly so no script reads it, sent only to these routes, gone after 10 minutes. It needs no
// signature: changing it gains nothing, as Google's answer must match it.
const FLOW_COOKIE = "pinch_google";
const FLOW_MS = 10 * 60_000;
const FlowSchema = z.object({
  state: z.string(),
  nonce: z.string(),
  codeVerifier: z.string(),
  next: z.string(),
  // The page's language (§16.1), for an account Google creates. English when it's missing.
  language: LanguageSchema.catch("en"),
});
type Flow = z.infer<typeof FlowSchema>;

// The ID token's claims we use. email_verified: Google has checked the email is theirs.
const ClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  nonce: z.string().optional(),
  // Their profile picture, for the avatar (§8.3): kept only as an https address on Google's image
  // host, so the page never loads a picture from anywhere else; any other value is as none, and
  // doesn't stop the sign-in. Kept as the URL parser writes it (normalize), so what was checked is
  // what the browser reads: "https:lh3…" would otherwise be stored as is, a relative address.
  picture: z
    .url({ protocol: /^https$/, hostname: /\.googleusercontent\.com$/, normalize: true })
    .optional()
    .catch(undefined),
});

type GoogleDeps = { google: Google; secureCookies: boolean; now: () => Date };

export function googleRouter(db: Db, { google, secureCookies, now }: GoogleDeps) {
  const router = express.Router();
  const origin = new URL(google.redirectUri).origin;
  const flowCookie = {
    httpOnly: true,
    sameSite: "lax",
    path: "/api/auth/google",
    secure: secureCookies,
  } as const;

  router.get("/", async (req, res) => {
    // Counted with the logins from this IP (§8.3): each sign-in makes a session.
    if (!(await countLoginTry(db, `ip ${req.ip ?? ""}`, LOGIN_TRIES_PER_IP, now()))) {
      res.redirect("/login?error=google&reason=too_many_tries");
      return;
    }
    const flow: Flow = {
      // state ties Google's answer to this browser (CSRF); nonce ties the ID token to it.
      state: newToken(),
      nonce: newToken(),
      // PKCE: Google gets the verifier's hash now and the verifier with the code, so a code
      // caught on the way back is no use to anyone else.
      codeVerifier: newToken(),
      next: nextPath(req.query.next, origin),
      language: FlowSchema.shape.language.parse(req.query.lang),
    };
    const json = JSON.stringify(flow);
    res.cookie(FLOW_COOKIE, Buffer.from(json).toString("base64url"), {
      ...flowCookie,
      maxAge: FLOW_MS,
    });
    const codeChallenge = createHash("sha256").update(flow.codeVerifier).digest("base64url");
    res.redirect(authorizationUrl(google, { ...flow, codeChallenge }));
  });

  router.get("/callback", async (req, res) => {
    const failed = (reason: string) => {
      req.log.info({ reason }, "Google sign-in failed");
      res.redirect(`/login?error=google&reason=${reason}`);
    };
    const flow = readFlow(req);
    // One use, whatever happens next.
    res.clearCookie(FLOW_COOKIE, flowCookie);
    // Counted too: each answer costs a call to Google and a check of its token.
    if (!(await countLoginTry(db, `ip ${req.ip ?? ""}`, LOGIN_TRIES_PER_IP, now()))) {
      failed("too_many_tries");
      return;
    }
    if (!flow) {
      failed("expired");
      return;
    }
    const claims = await checkCallback(req, flow, google);
    if (typeof claims === "string") {
      failed(claims);
      return;
    }
    const email = claims.email.toLowerCase();
    const user = await googleAccount(db, {
      googleId: claims.sub,
      email,
      // As signup's limit; an account without a name on Google gets its email's first part.
      name: claims.name?.trim().slice(0, 100) || email.split("@")[0] || email,
      picture: claims.picture,
      language: flow.language,
    });
    if (user === "linked_elsewhere") {
      failed(user);
      return;
    }
    await startSession(db, req, res, user, secureCookies);
    res.redirect(flow.next);
  });

  return router;
}

// Google's answer, checked in order (§8.3): the ID token's claims, or why it failed.
async function checkCallback(req: Request, flow: Flow, google: Google) {
  if (req.query.state !== flow.state) return "state";
  // A refused consent comes back with ?error=access_denied instead of a code.
  if (typeof req.query.code !== "string") return "denied";
  let claims;
  try {
    claims = ClaimsSchema.parse(await google.exchangeCode(req.query.code, flow.codeVerifier));
  } catch (error) {
    // What went wrong, not the error itself: jose's carry the token's claims (an email, a name).
    const code = error instanceof Error && "code" in error ? error.code : undefined;
    const message = error instanceof Error ? error.message : String(error);
    req.log.warn({ code, message }, "Google's code exchange or ID token failed");
    return "token";
  }
  if (claims.nonce !== flow.nonce) return "nonce";
  if (claims.email_verified !== true) return "unverified";
  return claims;
}

function readFlow(req: Request) {
  const value = readCookie(req, FLOW_COOKIE);
  if (!value) return null;
  try {
    return FlowSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString()));
  } catch {
    return null;
  }
}

// Where to go once signed in: ?next=, only when it stays on the site, read as the browser reads it,
// and not a path that starts "//" once its dots are resolved ("/.//x"): in the Location header, a
// browser reads that as the site x. The client's nextPage (client/src/features/auth/nextPage.ts)
// has the same rule and its cases.
function nextPath(next: unknown, origin: string) {
  if (typeof next !== "string") return "/";
  const url = URL.parse(next, origin);
  return url?.origin === origin && !url.pathname.startsWith("//")
    ? url.pathname + url.search + url.hash
    : "/";
}
