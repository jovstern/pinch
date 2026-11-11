import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { expect, test } from "vitest";
import { verifyIdToken } from "./google.ts";

// Google's keys, played by one of ours: the test signs ID tokens as Google would.
const google = await generateKeyPair("RS256");
const keys = createLocalJWKSet({
  keys: [{ ...(await exportJWK(google.publicKey)), kid: "google-key", alg: "RS256" }],
});
const clientId = "pinch.apps.googleusercontent.com";

function idToken({
  issuer = "https://accounts.google.com",
  audience = clientId,
  expires = "1h",
  key = google.privateKey,
} = {}) {
  return new SignJWT({ email: "cook@example.com", email_verified: true })
    .setProtectedHeader({ alg: "RS256", kid: "google-key" })
    .setSubject("google-123")
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expires)
    .sign(key);
}

test("an ID token signed by Google, for our client ID, gives its claims", async () => {
  const claims = await verifyIdToken(await idToken(), keys, clientId);
  expect(claims).toMatchObject({ sub: "google-123", email: "cook@example.com" });
});

test("an ID token signed by another key is refused", async () => {
  const other = await generateKeyPair("RS256");
  await expect(
    verifyIdToken(await idToken({ key: other.privateKey }), keys, clientId),
  ).rejects.toThrow();
});

test("an ID token for another client ID is refused", async () => {
  await expect(
    verifyIdToken(await idToken({ audience: "other-app" }), keys, clientId),
  ).rejects.toThrow();
});

test("an ID token from another issuer is refused", async () => {
  await expect(
    verifyIdToken(await idToken({ issuer: "https://evil.example" }), keys, clientId),
  ).rejects.toThrow();
});

test("an expired ID token is refused", async () => {
  await expect(
    verifyIdToken(await idToken({ expires: "1 hour ago" }), keys, clientId),
  ).rejects.toThrow();
});
