import { LoginInputSchema, SignupInputSchema, type Me } from "@pinch/shared";
import { hash, verify } from "@node-rs/argon2";
import express from "express";
import { MongoServerError, ObjectId, type Db } from "mongodb";
import { toMe, usersCollection, type UserDocument } from "../db/users.ts";
import { HttpError, parseInput } from "../errors.ts";

// A login with an unknown email still checks a password, against this hash, so it takes as long
// as a wrong password: the time doesn't say which emails have accounts (design §8.3).
const NO_USER_HASH = await hash("no account has this password");

// Sign up and log in (design §8, §8.3); the session they start comes next. Open to everyone.
// Passwords are hashed with argon2id (the library's default).
export function authRouter(db: Db) {
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
    res
      .status(201)
      .location("/api/auth/me")
      .json(toMe(user) satisfies Me);
  });

  router.post("/login", async (req, res) => {
    const { email, password } = parseInput(LoginInputSchema, req.body);
    const user = await users.findOne({ email });
    // An account made with Google has no password: the same answer as a wrong one.
    const passwordOk = await verify(user?.passwordHash ?? NO_USER_HASH, password);
    if (!user?.passwordHash || !passwordOk) {
      throw new HttpError(401, "wrong_login", "The email or password is wrong.");
    }
    res.json(toMe(user) satisfies Me);
  });

  return router;
}
