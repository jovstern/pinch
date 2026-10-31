import express from "express";
import request from "supertest";
import { expect, test } from "vitest";
import { devUser } from "./devUser.ts";

test("every request acts as the dev user", async () => {
  const app = express();
  app.use(devUser("000000000000000000000001"));
  app.get("/whoami", (req, res) => {
    res.json({ userId: req.userId.toHexString() });
  });

  const response = await request(app).get("/whoami");
  expect(response.body).toEqual({ userId: "000000000000000000000001" });
});
