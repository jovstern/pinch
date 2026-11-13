import { z } from "zod";
import { messages } from "./messages.ts";

// Accounts (design §8.3). Emails are kept lowercase, so one address is one account whatever the
// case it's typed in.
const EmailSchema = z
  .string(messages.emailRequired)
  .trim()
  .toLowerCase()
  .min(1, messages.emailRequired)
  .pipe(z.email(messages.emailInvalid).max(254, messages.emailTooLong));

// The interface's language (design §16.1, D40): on the account, in me, and in the pinch_lang cookie.
export const LanguageSchema = z.enum(["en", "he"]);
export type Language = z.infer<typeof LanguageSchema>;

// The body of POST /api/auth/signup. At least 8 characters and no other rules (§8.3); the cap
// keeps hashing cheap.
export const SignupInputSchema = z.object({
  email: EmailSchema,
  password: z
    .string(messages.passwordChoose)
    .min(8, messages.passwordTooShort)
    .max(200, messages.passwordTooLong),
  name: z
    .string(messages.nameRequired)
    .trim()
    .min(1, messages.nameRequired)
    .max(100, messages.nameTooLong),
  // The language the page was in: the new account keeps it (§16.1). None is English.
  language: LanguageSchema.optional(),
});
export type SignupInput = z.infer<typeof SignupInputSchema>;

// The body of POST /api/auth/login. No minimum beyond one character, so an old short password
// isn't refused before it's checked; the same cap as signup's, so a huge one isn't hashed.
export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: z
    .string(messages.passwordRequired)
    .min(1, messages.passwordRequired)
    .max(200, messages.passwordTooLong),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

// The signed-in user: what signup, login and GET /api/auth/me answer.
export const MeSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  language: LanguageSchema,
  // Google's profile picture, for the avatar; none for an account that never signed in with Google.
  picture: z.url().optional(),
});
export type Me = z.infer<typeof MeSchema>;

// The body of PATCH /api/auth/me: the language, and nothing else (a 400 for any other field).
export const MePatchSchema = z.strictObject({ language: LanguageSchema });
export type MePatch = z.infer<typeof MePatchSchema>;

// GET /api/auth/providers: the ways to sign in besides a password. Google is on only when the
// API has its settings (§8.3).
export const ProvidersSchema = z.object({ google: z.boolean() });
export type Providers = z.infer<typeof ProvidersSchema>;
