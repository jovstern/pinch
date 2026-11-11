import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import { z } from "zod";
import type { Config } from "./config.ts";

// Google sign-in (design §8.3): the OpenID Connect code flow, by hand. Two plain requests (the
// address the browser is sent to, and the code's exchange) and one library call, jose's
// jwtVerify, which checks the ID token's signature against Google's published keys.
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";
// Google signs its ID tokens with either form of its name.
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

type GoogleSettings = { clientId: string; clientSecret: string; redirectUri: string };

// What the routes need from Google. exchangeCode is the one network step, so a test passes a fake
// one, as it pins the clock (createApp's deps).
export type Google = GoogleSettings & {
  // The code and PKCE verifier → the ID token's claims, its signature, issuer, audience and expiry
  // checked. The routes check the rest (the nonce, a verified email).
  exchangeCode: (code: string, codeVerifier: string) => Promise<JWTPayload>;
};

// Google sign-in when .env has its client ID and secret; otherwise none, and its routes are 404.
export function googleFromConfig(config: Config): Google | undefined {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) return undefined;
  const settings = {
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: new URL("/api/auth/google/callback", config.PUBLIC_URL).href,
  };
  // Fetches Google's keys once, keeps them, and fetches again for a key it doesn't know (Google
  // rotates them).
  const keys = createRemoteJWKSet(new URL(KEYS_URL));
  return {
    ...settings,
    exchangeCode: (code, codeVerifier) => exchangeCode(settings, keys, code, codeVerifier),
  };
}

// Where the browser goes to sign in with Google: the state, nonce and PKCE challenge come back
// with the user (design §8.3).
export function authorizationUrl(
  { clientId, redirectUri }: GoogleSettings,
  { state, nonce, codeChallenge }: { state: string; nonce: string; codeChallenge: string },
) {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${AUTHORIZE_URL}?${query.toString()}`;
}

const TokenResponseSchema = z.object({ id_token: z.string() });

async function exchangeCode(
  settings: GoogleSettings,
  keys: JWTVerifyGetKey,
  code: string,
  codeVerifier: string,
) {
  // A form body (fetch sends it as application/x-www-form-urlencoded), as OAuth asks.
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    // A sign-in waits on this: give up after 10 s rather than hold the request open.
    signal: AbortSignal.timeout(10_000),
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: codeVerifier,
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      redirect_uri: settings.redirectUri,
    }),
  });
  if (!response.ok) throw new Error(`Google's token exchange answered ${String(response.status)}`);
  const { id_token } = TokenResponseSchema.parse(await response.json());
  return verifyIdToken(id_token, keys, settings.clientId);
}

// The ID token is Google's word on who signed in: signed by one of its keys, by Google, for our
// client ID, and not expired (jwtVerify checks exp). Exported for its test, which signs tokens
// with a key of its own.
export async function verifyIdToken(idToken: string, keys: JWTVerifyGetKey, clientId: string) {
  const { payload } = await jwtVerify(idToken, keys, {
    // Google signs with RS256 only: no other algorithm is accepted.
    algorithms: ["RS256"],
    issuer: ISSUERS,
    audience: clientId,
  });
  return payload;
}
