import { MeSchema } from "@pinch/shared";
import { pino } from "pino";
import request from "supertest";
import { beforeEach, expect, test } from "vitest";
import { createApp } from "../app.ts";
import { createIndexes } from "../db/indexes.ts";
import {
  LOGIN_TRIES_PER_EMAIL,
  LOGIN_TRIES_PER_IP,
  loginAttemptsCollection,
  SIGNUPS_PER_IP,
} from "../db/loginAttempts.ts";
import { hashToken, sessionsCollection } from "../db/sessions.ts";
import { usersCollection } from "../db/users.ts";
import { createTestDb } from "../testDb.ts";

const db = createTestDb();
// The unique email index answers a second sign-up.
await createIndexes(db);
// Supertest speaks http, so no Secure cookie. The rate limit's clock is pinned mid-minute: a run
// that crosses a minute can't split its tries over two counts.
const deps = {
  logger: pino({ level: "silent" }),
  db,
  now: () => new Date("2026-11-11T10:05:30Z"),
};
const app = createApp({ ...deps, secureCookies: false });

// Every test logs in from the same address: each starts with no tries counted.
beforeEach(async () => {
  await loginAttemptsCollection(db).deleteMany({});
});

let accounts = 0;
// A new account for each test, so they don't share one.
async function signUp() {
  accounts += 1;
  const account = { email: `cook${String(accounts)}@example.com`, password: "a long password" };
  const response = await request(app)
    .post("/api/auth/signup")
    .send({ ...account, name: "Cook" });
  return { ...account, response };
}

// The token the response set, as a Cookie header to send back.
function sessionCookie(response: request.Response) {
  const setCookie = response.headers["set-cookie"] as unknown as string[];
  return setCookie[0]?.split(";")[0] ?? "";
}

test("signup makes an account, signed in, and answers 201 me", async () => {
  const response = await request(app)
    .post("/api/auth/signup")
    .send({ email: " New@Example.com ", password: "a long password", name: "Dana" });

  expect(response.status).toBe(201);
  const { id } = MeSchema.parse(response.body);
  // The email is stored lowercase (design §8.3).
  expect(response.body).toEqual({ id, email: "new@example.com", name: "Dana" });
  const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(response));
  expect(me.body).toEqual(response.body);
});

test("signup with an email that has an account answers 409, whatever its case", async () => {
  const { email } = await signUp();

  const response = await request(app)
    .post("/api/auth/signup")
    .send({ email: email.toUpperCase(), password: "another password", name: "Other" });
  expect(response.status).toBe(409);
  expect(response.body).toMatchObject({ error: { code: "email_taken" } });
});

test("signup with a bad email or a short password answers 400 naming them", async () => {
  const response = await request(app)
    .post("/api/auth/signup")
    .send({ email: "not an email", password: "short", name: "" });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: {
      fields: {
        email: "Enter a valid email.",
        password: "Use at least 8 characters.",
        name: "Enter your name.",
      },
    },
  });
});

test("login with the right password answers 200 me and a new session", async () => {
  const { email, password, response: signup } = await signUp();

  const response = await request(app).post("/api/auth/login").send({ email, password });
  expect(response.status).toBe(200);
  expect(response.body).toEqual(signup.body);
  expect(sessionCookie(response)).not.toBe(sessionCookie(signup));
});

test("a wrong email and a wrong password get the same 401", async () => {
  const { email } = await signUp();

  const wrongEmail = await request(app)
    .post("/api/auth/login")
    .send({ email: "nobody@example.com", password: "a long password" });
  const wrongPassword = await request(app)
    .post("/api/auth/login")
    .send({ email, password: "not the password" });
  expect(wrongEmail.status).toBe(401);
  expect(wrongPassword.status).toBe(401);
  expect(wrongEmail.body).toEqual(wrongPassword.body);
  expect(wrongPassword.headers["set-cookie"]).toBeUndefined();
});

test("the session cookie is HttpOnly, SameSite=Lax and lasts 30 days; Secure unless told not", async () => {
  const { response } = await signUp();
  const setCookie = String(response.headers["set-cookie"]);
  expect(setCookie).toMatch(/^pinch_session=[\w-]{43}; Max-Age=2592000; Path=\/; Expires=/);
  expect(setCookie).toContain("; HttpOnly; SameSite=Lax");
  expect(setCookie).not.toContain("Secure");

  const secureApp = createApp(deps);
  const secure = await request(secureApp)
    .post("/api/auth/signup")
    .send({ email: "secure@example.com", password: "a long password", name: "Cook" });
  expect(String(secure.headers["set-cookie"])).toContain("; Secure");
});

test("the database keeps only the token's hash and the password's argon2id hash", async () => {
  const { email, password, response } = await signUp();
  const token = sessionCookie(response).split("=")[1] ?? "";

  const user = await usersCollection(db).findOne({ email });
  expect(user?.passwordHash).toMatch(/^\$argon2id\$/);
  expect(user?.passwordHash).not.toContain(password);
  const session = await sessionsCollection(db).findOne({ userId: user?._id });
  expect(session?.tokenHash).toBe(hashToken(token));
  expect(JSON.stringify(session)).not.toContain(token);
});

test("logout deletes the session, clears the cookie and answers 204", async () => {
  const { response } = await signUp();
  const cookie = sessionCookie(response);

  const logout = await request(app).post("/api/auth/logout").set("Cookie", cookie).send({});
  expect(logout.status).toBe(204);
  expect(String(logout.headers["set-cookie"])).toMatch(
    /^pinch_session=; Path=\/; Expires=Thu, 01 Jan 1970/,
  );
  const token = cookie.split("=")[1] ?? "";
  expect(await sessionsCollection(db).findOne({ tokenHash: hashToken(token) })).toBeNull();
  const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
  expect(me.body).toBeNull();
});

test("me without a cookie, or with an unknown one, answers 200 null: nobody", async () => {
  const none = await request(app).get("/api/auth/me");
  const unknown = await request(app).get("/api/auth/me").set("Cookie", "pinch_session=nope");

  expect(none.status).toBe(200);
  expect(none.body).toBeNull();
  expect(unknown.status).toBe(200);
  expect(unknown.body).toBeNull();
});

test("a session comes with the signed-in hint, readable by the page, and logout clears both", async () => {
  const { response } = await signUp();
  const hint = String((response.headers["set-cookie"] as unknown as string[])[1]);
  expect(hint).toMatch(/^pinch_signed_in=1; Max-Age=2592000; Path=\/; Expires=/);
  expect(hint).toContain("; SameSite=Lax");
  expect(hint).not.toContain("HttpOnly");

  const logout = await request(app)
    .post("/api/auth/logout")
    .set("Cookie", `${sessionCookie(response)}; pinch_signed_in=1`)
    .send({});
  expect(String(logout.headers["set-cookie"])).toMatch(
    /pinch_signed_in=; Path=\/; Expires=Thu, 01/,
  );
});

test("me gives a signed-in browser the hint if it lacks one", async () => {
  const { response } = await signUp();
  const me = await request(app).get("/api/auth/me").set("Cookie", sessionCookie(response));
  expect(String(me.headers["set-cookie"])).toMatch(/^pinch_signed_in=1; Max-Age=2592000/);
});

test("me clears a hint left without a session", async () => {
  const me = await request(app).get("/api/auth/me").set("Cookie", "pinch_signed_in=1");
  expect(String(me.headers["set-cookie"])).toMatch(/^pinch_signed_in=; Path=\/; Expires=Thu, 01/);
});

test("an expired session counts as none, before the TTL index deletes it", async () => {
  const { response } = await signUp();
  const cookie = sessionCookie(response);
  const token = cookie.split("=")[1] ?? "";
  await sessionsCollection(db).updateOne(
    { tokenHash: hashToken(token) },
    { $set: { expiresAt: new Date(Date.now() - 1000) } },
  );

  const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
  expect(me.body).toBeNull();
});

test("past the tries a minute for an email, even the right password answers 429", async () => {
  const { email, password } = await signUp();
  for (let i = 0; i < LOGIN_TRIES_PER_EMAIL; i++) {
    await request(app).post("/api/auth/login").send({ email, password: "not the password" });
  }

  const response = await request(app).post("/api/auth/login").send({ email, password });
  expect(response.status).toBe(429);
  expect(response.body).toMatchObject({ error: { code: "too_many_tries" } });
});

test("past the tries a minute from one address, any email answers 429", async () => {
  for (let i = 0; i < LOGIN_TRIES_PER_IP; i++) {
    await request(app)
      .post("/api/auth/login")
      .send({ email: `guess${String(i)}@example.com`, password: "a guess" });
  }
  const { email, password } = await signUp();

  const response = await request(app).post("/api/auth/login").send({ email, password });
  expect(response.status).toBe(429);
});

test("login with a password over 200 characters answers 400 without checking it", async () => {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ email: "cook@example.com", password: "x".repeat(201) });

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    error: { fields: { password: "Keep the password under 200 characters." } },
  });
});

test("logout without a JSON Content-Type answers 415 and keeps the session", async () => {
  const { response } = await signUp();
  const cookie = sessionCookie(response);

  // What a form on another site would send.
  const logout = await request(app)
    .post("/api/auth/logout")
    .set("Cookie", cookie)
    .type("form")
    .send("x=1");
  expect(logout.status).toBe(415);
  const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
  expect(me.status).toBe(200);
});

test("login from a browser with a session ends that session", async () => {
  const { email, password, response } = await signUp();
  const oldCookie = sessionCookie(response);

  await request(app).post("/api/auth/login").set("Cookie", oldCookie).send({ email, password });
  const token = oldCookie.split("=")[1] ?? "";
  expect(await sessionsCollection(db).findOne({ tokenHash: hashToken(token) })).toBeNull();
});

test("past the sign-ups a minute from one address, signup answers 429 before hashing", async () => {
  for (let i = 0; i < SIGNUPS_PER_IP; i++) await signUp();

  const { response } = await signUp();
  expect(response.status).toBe(429);
});

test("behind a trusted proxy, each browser's address has its own tries", async () => {
  const proxied = createApp({ ...deps, secureCookies: false, trustProxy: 1 });
  for (let i = 0; i < LOGIN_TRIES_PER_IP; i++) {
    await request(proxied)
      .post("/api/auth/login")
      .set("X-Forwarded-For", "203.0.113.1")
      .send({ email: `guess${String(i)}@example.com`, password: "a guess" });
  }

  const other = await request(proxied)
    .post("/api/auth/login")
    .set("X-Forwarded-For", "203.0.113.2")
    .send({ email: "guess@example.com", password: "a guess" });
  expect(other.status).toBe(401);
});
