import { LoginInputSchema, SignupInputSchema, type Me } from "@pinch/shared";
import { hash, verify } from "@node-rs/argon2";
import express from "express";
import { MongoServerError, ObjectId, type Db } from "mongodb";
import {
  countLoginTry,
  LOGIN_TRIES_PER_EMAIL,
  LOGIN_TRIES_PER_IP,
  SIGNUPS_PER_IP,
} from "../db/loginAttempts.ts";
import { toMe, usersCollection, type UserDocument } from "../db/users.ts";
import { HttpError, parseInput } from "../errors.ts";
import { currentUser, endSession, startSession } from "../session.ts";

// A login with an unknown email still checks a password, against this hash, so it takes as long
// as a wrong password: the time doesn't say which emails have accounts (design §8.3).
const NO_USER_HASH = await hash("no account has this password");

// Sign up, log in, log out and who am I (design §8, §8.3). Open to everyone: these are how a
// browser gets a session. Passwords are hashed with argon2id (the library's default).
// now: the clock the rate limit counts minutes by (tests pin it).
type AuthDeps = { secureCookies: boolean; now: () => Date };

const tooManyTries = () =>
  new HttpError(429, "too_many_tries", "Too many tries. Wait a minute and try again.");

export function authRouter(db: Db, { secureCookies, now }: AuthDeps) {
  const users = usersCollection(db);
  const router = express.Router();

  router.post("/signup", async (req, res) => {
    const { email, password, name } = parseInput(SignupInputSchema, req.body);
    // Counted before the hash, which is what costs (§8.3). req.ip: see app.ts's trust proxy.
    if (!(await countLoginTry(db, `signup ip ${req.ip ?? ""}`, SIGNUPS_PER_IP, now()))) {
      throw tooManyTries();
    }
    const user: UserDocument = {
      _id: new ObjectId(),
      email,
      name,
      passwordHash: await hash(password),
      createdAt: new Date(),
    };
    try {
      await users.insertOne(user);
    } catch (error) {
      // 11000 is Mongo's duplicate key: the unique email index lets one account per email.
      if (!(error instanceof MongoServerError && error.code === 11000)) throw error;
      throw new HttpError(409, "email_taken", "This email can't sign up again. Log in instead.");
    }
    await startSession(db, req, res, user._id, secureCookies);
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
    await startSession(db, req, res, user._id, secureCookies);
    res.json(toMe(user) satisfies Me);
  });

  router.post("/logout", async (req, res) => {
    // JSON only, as every other mutation: a form on another site can't send that Content-Type,
    // so it can't sign the user out (CSRF, §8.3).
    if (!req.headers["content-type"]?.startsWith("application/json")) {
      throw new HttpError(415, "json_only", "Send the request as JSON.");
    }
    await endSession(db, req, res, secureCookies);
    res.status(204).end();
  });

  router.get("/me", async (req, res) => {
    const user = await currentUser(db, req);
    if (!user) throw new HttpError(401, "signed_out", "Log in to continue.");
    res.json(toMe(user) satisfies Me);
  });

  return router;
}
