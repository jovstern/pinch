import { createHash } from "node:crypto";
import { MeSchema } from "@pinch/shared";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { ObjectId } from "mongodb";
import { pino } from "pino";
import request from "supertest";
import { beforeEach, expect, test } from "vitest";
import { createApp } from "../app.ts";
import { createIndexes } from "../db/indexes.ts";
import { LOGIN_TRIES_PER_IP, loginAttemptsCollection } from "../db/loginAttempts.ts";
import { sessionsCollection } from "../db/sessions.ts";
import { usersCollection } from "../db/users.ts";
import { verifyIdToken, type Google } from "../google.ts";
import { createTestDb } from "../testDb.ts";

const db = createTestDb();
await createIndexes(db);

// Google, played by the test: the claims its ID token would carry (already verified: that's
// google.test.ts), or an exchange of the test's own, and the code and verifier it was given.
let claims: Record<string, unknown> = {};
let exchange: (() => Promise<JWTPayload>) | undefined;
let exchanged: { code: string; codeVerifier: string } | undefined;
const google: Google = {
  clientId: "pinch.apps.googleusercontent.com",
  clientSecret: "secret",
  redirectUri: "http://localhost:5173/api/auth/google/callback",
  exchangeCode: (code, codeVerifier) => {
    exchanged = { code, codeVerifier };
    return exchange ? exchange() : Promise.resolve(claims);
  },
};
// The API's log lines, to check what they leave out.
const logLines: string[] = [];
const deps = {
  logger: pino({ level: "info" }, { write: (line: string) => void logLines.push(line) }),
  db,
  secureCookies: false,
  now: () => new Date("2026-11-11T10:05:30Z"),
};
const app = createApp({ ...deps, google });

beforeEach(async () => {
  await loginAttemptsCollection(db).deleteMany({});
  exchanged = undefined;
  exchange = undefined;
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
  const account = { email: user.email.toLowerCase(), password: "a long password" };
  const signup = await request(app)
    .post("/api/auth/signup")
    .send({ ...account, name: "Cook" });

  const response = await callBack(await start(), user);
  const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(response));
  expect(me.body).toMatchObject({ id: MeSchema.parse(signup.body).id, name: "Cook" });
  expect(await usersCollection(db).findOne({ email: account.email })).toMatchObject({
    googleId: user.sub,
  });
});

// Someone signed up with the email before its owner did (§8.3): once the owner signs in with
// Google, their password and session are no use.
test("linking an account by email drops its password and ends its sessions", async () => {
  const user = googleUser();
  const account = { email: user.email.toLowerCase(), password: "a long password" };
  const signup = await request(app)
    .post("/api/auth/signup")
    .send({ ...account, name: "Squatter" });

  await callBack(await start(), user);
  const oldSession = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(signup));
  expect(oldSession.body).toBeNull();
  const login = await request(app).post("/api/auth/login").send(account);
  expect(login.status).toBe(401);
  const _id = new ObjectId(MeSchema.parse(signup.body).id);
  expect(await usersCollection(db).findOne({ _id })).not.toHaveProperty("passwordHash");
  expect(await sessionsCollection(db).countDocuments({ userId: _id })).toBe(1);
});

test("an email whose account is linked to another Google account can't sign in", async () => {
  const user = googleUser();
  await usersCollection(db).insertOne({
    _id: new ObjectId(),
    email: user.email.toLowerCase(),
    name: "Cook",
    googleId: "another-google-account",
    createdAt: new Date(),
  });

  const response = await callBack(await start(), user);
  expect(response.headers.location).toBe("/login?error=google&reason=linked_elsewhere");
  expect(sessionCookie(response)).toBe("");
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

test("a failed code exchange goes back to Log in", async () => {
  exchange = () => Promise.reject(new Error("invalid_grant"));
  const response = await callBack(await start(), googleUser());
  expect(response.headers.location).toBe("/login?error=google&reason=token");
});

// The exchange gives an ID token checked as the real one is (verifyIdToken), with a key that
// plays Google's.
test.each<{ name: string; issuer?: string; audience?: string }>([
  { name: "another client ID", audience: "other-app" },
  { name: "another issuer", issuer: "https://evil.example" },
])(
  "an ID token for $name goes back to Log in",
  async ({ issuer = "https://accounts.google.com", audience = google.clientId }) => {
    const key = await generateKeyPair("RS256");
    const keys = createLocalJWKSet({
      keys: [{ ...(await exportJWK(key.publicKey)), kid: "k", alg: "RS256" }],
    });
    const token = await new SignJWT({ email: "cook@example.com", email_verified: true })
      .setProtectedHeader({ alg: "RS256", kid: "k" })
      .setSubject("google-wrong")
      .setIssuer(issuer)
      .setAudience(audience)
      .setExpirationTime("1h")
      .sign(key.privateKey);
    exchange = () => verifyIdToken(token, keys, google.clientId);

    const response = await callBack(await start(), googleUser());
    expect(response.headers.location).toBe("/login?error=google&reason=token");
  },
);

// A browser reads each as another site: a tab is dropped ("//evil"), and the dots resolve to
// //evil.com.
test.each(["/\t/evil", "/.//evil.com", "/x/..//evil.com", "/%2e//evil.com"])(
  "next=%s stays on the site",
  async (next) => {
    const response = await callBack(await start(next), googleUser());
    expect(response.headers.location).toBe("/");
  },
);

test("the callback's code and state aren't written to the log", async () => {
  logLines.length = 0;
  await callBack(await start(), googleUser());
  const callbackLines = logLines.filter((line) => line.includes("/api/auth/google/callback"));
  expect(callbackLines).not.toHaveLength(0);
  expect(logLines.join("")).not.toMatch(/code=|state=/);
});

test("sign-ins count with the logins from the IP", async () => {
  for (let i = 0; i < LOGIN_TRIES_PER_IP; i += 1) await start();
  const { response } = await start();
  expect(response.headers.location).toBe("/login?error=google&reason=too_many_tries");
});

test("Google's answers count with the logins from the IP too", async () => {
  const flow = await start();
  for (let i = 1; i < LOGIN_TRIES_PER_IP; i += 1) await start();
  const response = await callBack(flow, googleUser());
  expect(response.headers.location).toBe("/login?error=google&reason=too_many_tries");
});

test("without Google's settings, its routes are 404 and providers says so", async () => {
  const withoutGoogle = createApp(deps);
  expect((await request(withoutGoogle).get("/api/auth/google")).status).toBe(404);
  expect((await request(withoutGoogle).get("/api/auth/google/callback")).status).toBe(404);
  expect((await request(withoutGoogle).get("/api/auth/providers")).body).toEqual({ google: false });
  expect((await request(app).get("/api/auth/providers")).body).toEqual({ google: true });
});
