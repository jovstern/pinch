import { createHash } from "node:crypto";
import { ObjectId } from "mongodb";
import { pino } from "pino";
import request from "supertest";
import { beforeEach, expect, test } from "vitest";
import { createApp } from "../app.ts";
import { createIndexes } from "../db/indexes.ts";
import { LOGIN_TRIES_PER_IP, loginAttemptsCollection } from "../db/loginAttempts.ts";
import { usersCollection } from "../db/users.ts";
import type { Google } from "../google.ts";
import { createTestDb } from "../testDb.ts";

const db = createTestDb();
await createIndexes(db);

// Google, played by the test: the claims its ID token would carry (already verified: that's
// google.test.ts), or the error its exchange fails with, and the code and verifier it was given.
let claims: Record<string, unknown> = {};
let exchangeError: Error | undefined;
let exchanged: { code: string; codeVerifier: string } | undefined;
const google: Google = {
  clientId: "pinch.apps.googleusercontent.com",
  clientSecret: "secret",
  redirectUri: "http://localhost:5173/api/auth/google/callback",
  exchangeCode: (code, codeVerifier) => {
    exchanged = { code, codeVerifier };
    return exchangeError ? Promise.reject(exchangeError) : Promise.resolve(claims);
  },
};
const deps = {
  logger: pino({ level: "silent" }),
  db,
  secureCookies: false,
  now: () => new Date("2026-11-11T10:05:30Z"),
};
const app = createApp({ ...deps, google });

beforeEach(async () => {
  await loginAttemptsCollection(db).deleteMany({});
  exchanged = undefined;
  exchangeError = undefined;
});

let accounts = 0;
// A Google user of each test's own.
function googleUser() {
  accounts += 1;
  return { sub: `google-${String(accounts)}`, email: `Cook${String(accounts)}@Example.com` };
}

// Starts a sign-in as the Log in page does: the address Google is sent to and the flow cookie.
async function start(next = "/recipes") {
  const response = await request(app).get("/api/auth/google").query({ next });
  const setCookie = (response.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  // A base, as a refusal goes to /login on our own site.
  const google = new URL(response.headers.location ?? "", "http://localhost:5173");
  return {
    response,
    flowCookie: setCookie[0] ?? "",
    cookie: setCookie[0]?.split(";")[0] ?? "",
    query: google.searchParams,
  };
}

// Google sends the browser back with the state and a code; the browser sends the flow cookie.
async function callBack(
  { cookie, query }: Awaited<ReturnType<typeof start>>,
  user: Record<string, unknown>,
) {
  claims = { nonce: query.get("nonce"), email_verified: true, name: "Dana", ...user };
  return request(app)
    .get("/api/auth/google/callback")
    .query({ state: query.get("state"), code: "the-code" })
    .set("Cookie", cookie);
}

function sessionCookie(response: request.Response) {
  const setCookie = response.headers["set-cookie"] as unknown as string[];
  return setCookie.find((line) => line.startsWith("pinch_session=")) ?? "";
}

test("a sign-in sends the browser to Google with the state, nonce and PKCE challenge", async () => {
  const { response, flowCookie, query } = await start();

  expect(response.status).toBe(302);
  expect(response.headers.location).toMatch(
    /^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/,
  );
  expect(query.get("client_id")).toBe(google.clientId);
  expect(query.get("redirect_uri")).toBe("http://localhost:5173/api/auth/google/callback");
  expect(query.get("response_type")).toBe("code");
  expect(query.get("scope")).toBe("openid email profile");
  expect(query.get("state")).toMatch(/^[\w-]{43}$/);
  expect(query.get("nonce")).toMatch(/^[\w-]{43}$/);
  expect(query.get("code_challenge_method")).toBe("S256");
  expect(flowCookie).toMatch(
    /^pinch_google=.+; Max-Age=600; Path=\/api\/auth\/google; .*HttpOnly; SameSite=Lax$/,
  );
  // The challenge is the hash of the verifier the cookie keeps, which only the exchange sees.
  const flow = Buffer.from(flowCookie.split(/[=;]/)[1] ?? "", "base64url").toString();
  const { codeVerifier } = JSON.parse(flow) as { codeVerifier: string };
  expect(query.get("code_challenge")).toBe(
    createHash("sha256").update(codeVerifier).digest("base64url"),
  );
});

test("a new Google user gets an account, signed in, and goes where they were going", async () => {
  const flow = await start("/recipes?q=egg");
  const user = googleUser();

  const response = await callBack(flow, user);
  expect(response.status).toBe(302);
  expect(response.headers.location).toBe("/recipes?q=egg");
  expect(exchanged?.code).toBe("the-code");
  const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(response));
  expect(me.body).toMatchObject({ email: user.email.toLowerCase(), name: "Dana" });
  const account = await usersCollection(db).findOne({ googleId: user.sub });
  expect(account?.passwordHash).toBeUndefined();
  // The flow cookie is used once.
  expect(response.headers["set-cookie"]).toContainEqual(expect.stringMatching(/^pinch_google=;/));
});

test("a Google sign-in with a password account's email signs into it and links it", async () => {
  const user = googleUser();
  const _id = new ObjectId();
  await usersCollection(db).insertOne({
    _id,
    email: user.email.toLowerCase(),
    name: "Cook",
    passwordHash: "argon2id hash",
    createdAt: new Date(),
  });

  const response = await callBack(await start(), user);
  const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(response));
  expect(me.body).toMatchObject({ id: _id.toHexString(), name: "Cook" });
  expect(await usersCollection(db).findOne({ _id })).toMatchObject({
    googleId: user.sub,
    passwordHash: "argon2id hash",
  });
});

test("a returning Google user signs into their account, even with a new email", async () => {
  const user = googleUser();
  await callBack(await start(), user);

  const response = await callBack(await start(), { ...user, email: "renamed@example.com" });
  const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(response));
  expect(me.body).toMatchObject({ email: user.email.toLowerCase() });
  expect(await usersCollection(db).countDocuments({ googleId: user.sub })).toBe(1);
});

test("an answer whose state isn't this browser's goes back to Log in", async () => {
  const flow = await start();
  const response = await request(app)
    .get("/api/auth/google/callback")
    .query({ state: "someone-elses", code: "the-code" })
    .set("Cookie", flow.cookie);

  expect(response.headers.location).toBe("/login?error=google&reason=state");
  expect(exchanged).toBeUndefined();
});

test("an answer without the flow cookie (expired or never started) goes back to Log in", async () => {
  const flow = await start();
  const response = await callBack({ ...flow, cookie: "" }, googleUser());
  expect(response.headers.location).toBe("/login?error=google&reason=expired");
});

test("a refused consent goes back to Log in", async () => {
  const flow = await start();
  const response = await request(app)
    .get("/api/auth/google/callback")
    .query({ state: flow.query.get("state"), error: "access_denied" })
    .set("Cookie", flow.cookie);
  expect(response.headers.location).toBe("/login?error=google&reason=denied");
});

test("an ID token for another sign-in (its nonce) goes back to Log in", async () => {
  const flow = await start();
  const response = await callBack(flow, { ...googleUser(), nonce: "another" });
  expect(response.headers.location).toBe("/login?error=google&reason=nonce");
});

test("an email Google hasn't verified makes no account", async () => {
  const user = googleUser();
  const response = await callBack(await start(), { ...user, email_verified: false });

  expect(response.headers.location).toBe("/login?error=google&reason=unverified");
  expect(await usersCollection(db).findOne({ googleId: user.sub })).toBeNull();
});

test("a failed code exchange or ID token goes back to Log in", async () => {
  exchangeError = new Error("invalid_grant");
  const response = await callBack(await start(), googleUser());
  expect(response.headers.location).toBe("/login?error=google&reason=token");
});

test("next stays on the site", async () => {
  const response = await callBack(await start("/\t/evil"), googleUser());
  expect(response.headers.location).toBe("/");
});

test("sign-ins count with the logins from the IP", async () => {
  for (let i = 0; i < LOGIN_TRIES_PER_IP; i += 1) await start();
  const { response } = await start();
  expect(response.headers.location).toBe("/login?error=google&reason=too_many_tries");
});

test("without Google's settings, its routes are 404 and providers says so", async () => {
  const withoutGoogle = createApp(deps);
  expect((await request(withoutGoogle).get("/api/auth/google")).status).toBe(404);
  expect((await request(withoutGoogle).get("/api/auth/google/callback")).status).toBe(404);
  expect((await request(withoutGoogle).get("/api/auth/providers")).body).toEqual({ google: false });
  expect((await request(app).get("/api/auth/providers")).body).toEqual({ google: true });
});
