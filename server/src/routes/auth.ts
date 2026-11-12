import { LoginInputSchema, MePatchSchema, SignupInputSchema, type Me } from "@pinch/shared";
import { hash, verify } from "@node-rs/argon2";
import express, { type Request } from "express";
import { MongoServerError, ObjectId, type Db } from "mongodb";
import {
  countLoginTry,
  LOGIN_TRIES_PER_EMAIL,
  LOGIN_TRIES_PER_IP,
  SIGNUPS_PER_IP,
} from "../db/loginAttempts.ts";
import { toMe, usersCollection, type UserDocument } from "../db/users.ts";
import { HttpError, parseInput } from "../errors.ts";
import {
  clearSignedInHint,
  currentUser,
  endSession,
  readCookie,
  setLanguageCookie,
  setSignedInHint,
  SIGNED_IN_HINT,
  startSession,
} from "../session.ts";

// A login with an unknown email still checks a password, against this hash, so it takes as long
// as a wrong password: the time doesn't say which emails have accounts (design §8.3).
const NO_USER_HASH = await hash("no account has this password");

// Sign up, log in, log out and who am I (design §8, §8.3). Open to everyone: these are how a
// browser gets a session. Passwords are hashed with argon2id (the library's default).
// now: the clock the rate limit counts minutes by (tests pin it).
type AuthDeps = { secureCookies: boolean; now: () => Date };

const tooManyTries = () =>
  new HttpError(429, "too_many_tries", "Too many tries. Wait a minute and try again.");

// JSON only, as every other mutation: a form on another site can't send that Content-Type, so it
// can't sign the user out or change their account (CSRF, §8.3).
function requireJson(req: Request) {
  if (!req.headers["content-type"]?.startsWith("application/json")) {
    throw new HttpError(415, "json_only", "Send the request as JSON.");
  }
}

export function authRouter(db: Db, { secureCookies, now }: AuthDeps) {
  const users = usersCollection(db);
  const router = express.Router();

  router.post("/signup", async (req, res) => {
    const { email, password, name, language } = parseInput(SignupInputSchema, req.body);
    // Counted before the hash, which is what costs (§8.3). req.ip: see app.ts's trust proxy.
    if (!(await countLoginTry(db, `signup ip ${req.ip ?? ""}`, SIGNUPS_PER_IP, now()))) {
      throw tooManyTries();
    }
    const user: UserDocument = {
      _id: new ObjectId(),
      email,
      name,
      passwordHash: await hash(password),
      language: language ?? "en",
      createdAt: new Date(),
    };
    try {
      await users.insertOne(user);
    } catch (error) {
      // 11000 is Mongo's duplicate key: the unique email index lets one account per email.
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
      throw new HttpError(409, "email_taken", "This email can't sign up again. Log in instead.");
    }
    await startSession(db, req, res, user, secureCookies);
    res
      .status(201)
      .location("/api/auth/me")
      .json(toMe(user) satisfies Me);
  });

  router.post("/login", async (req, res) => {
    const { email, password } = parseInput(LoginInputSchema, req.body);
    const minute = now();
    const [ipOk, emailOk] = await Promise.all([
      countLoginTry(db, `ip ${req.ip ?? ""}`, LOGIN_TRIES_PER_IP, minute),
      countLoginTry(db, `email ${email}`, LOGIN_TRIES_PER_EMAIL, minute),
    ]);
    if (!ipOk || !emailOk) throw tooManyTries();
    const user = await users.findOne({ email });
    // An account made with Google has no password: the same answer as a wrong one.
    const passwordOk = await verify(user?.passwordHash ?? NO_USER_HASH, password);
    if (!user?.passwordHash || !passwordOk) {
      throw new HttpError(401, "wrong_login", "The email or password is wrong.");
    }
    await startSession(db, req, res, user, secureCookies);
    res.json(toMe(user) satisfies Me);
  });

  router.post("/logout", async (req, res) => {
    requireJson(req);
    await endSession(db, req, res, secureCookies);
    res.status(204).end();
  });

  // Who is signed in, or null: nobody is an answer here, not an error (a 401 would be logged in
  // the console of every signed-out page, which asks this first, §8.3).
  router.get("/me", async (req, res) => {
    const user = await currentUser(db, req);
    if (!user) {
      clearSignedInHint(req, res, secureCookies);
      res.json(null);
      return;
    }
    if (!readCookie(req, SIGNED_IN_HINT)) setSignedInHint(res, secureCookies);
    // The account's language, so a new device's next page starts in it (§16.1).
    setLanguageCookie(res, user, secureCookies);
    res.json(toMe(user) satisfies Me);
  });

  // The avatar menu's language picker (§16.1): saves it and sets the cookie; the page then
  // reloads in it. Only the language: any other field is a 400.
  router.patch("/me", async (req, res) => {
    requireJson(req);
    const user = await currentUser(db, req);
    if (!user) {
      clearSignedInHint(req, res, secureCookies);
      throw new HttpError(401, "signed_out", "Log in to continue.");
    }
    const { language } = parseInput(MePatchSchema, req.body);
    await users.updateOne({ _id: user._id }, { $set: { language } });
    const changed = { ...user, language };
    setLanguageCookie(res, changed, secureCookies);
    res.json(toMe(changed) satisfies Me);
  });

  return router;
}
