import { LoginInputSchema, SignupInputSchema, type Me } from "@pinch/shared";
import { hash, verify } from "@node-rs/argon2";
import express from "express";
import { MongoServerError, ObjectId, type Db } from "mongodb";
import { countLoginTry, LOGIN_TRIES_PER_EMAIL, LOGIN_TRIES_PER_IP } from "../db/loginAttempts.ts";
import { toMe, usersCollection, type UserDocument } from "../db/users.ts";
import { HttpError, parseInput } from "../errors.ts";
import { currentUser, endSession, startSession } from "../session.ts";

// A login with an unknown email still checks a password, against this hash, so it takes as long
// as a wrong password: the time doesn't say which emails have accounts (design §8.3).
const NO_USER_HASH = await hash("no account has this password");

// Sign up, log in, log out and who am I (design §8, §8.3). Open to everyone: these are how a
// browser gets a session. Passwords are hashed with argon2id (the library's default).
export function authRouter(db: Db, { secureCookies }: { secureCookies: boolean }) {
  const users = usersCollection(db);
  const router = express.Router();

  router.post("/signup", async (req, res) => {
    const { email, password, name } = parseInput(SignupInputSchema, req.body);
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
    await startSession(db, res, user._id, secureCookies);
    res
      .status(201)
      .location("/api/auth/me")
      .json(toMe(user) satisfies Me);
  });

  router.post("/login", async (req, res) => {
    const { email, password } = parseInput(LoginInputSchema, req.body);
    // Express's req.ip is the connection's address: no "trust proxy", as nothing stands in front
    // of the API but Vite's proxy in development (§8.3).
    const [ipOk, emailOk] = await Promise.all([
      countLoginTry(db, `ip ${req.ip ?? ""}`, LOGIN_TRIES_PER_IP),
      countLoginTry(db, `email ${email}`, LOGIN_TRIES_PER_EMAIL),
    ]);
    if (!ipOk || !emailOk) {
      throw new HttpError(429, "too_many_tries", "Too many tries. Wait a minute and try again.");
    }
    const user = await users.findOne({ email });
    // An account made with Google has no password: the same answer as a wrong one.
    const passwordOk = await verify(user?.passwordHash ?? NO_USER_HASH, password);
    if (!user?.passwordHash || !passwordOk) {
      throw new HttpError(401, "wrong_login", "The email or password is wrong.");
    }
    await startSession(db, res, user._id, secureCookies);
    res.json(toMe(user) satisfies Me);
  });

  router.post("/logout", async (req, res) => {
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
