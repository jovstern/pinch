import { z } from "zod";

// Accounts (design §8.3). Emails are kept lowercase, so one address is one account whatever the
// case it's typed in.
const EmailSchema = z
  .string("Enter your email.")
  .trim()
  .toLowerCase()
  .min(1, "Enter your email.")
  .pipe(z.email("Enter a valid email.").max(254, "Keep the email under 254 characters."));

// The interface's language (design §16.1, D40): on the account, in me, and in the pinch_lang cookie.
export const LanguageSchema = z.enum(["en", "he"]);
export type Language = z.infer<typeof LanguageSchema>;

// The body of POST /api/auth/signup. At least 8 characters and no other rules (§8.3); the cap
// keeps hashing cheap.
export const SignupInputSchema = z.object({
  email: EmailSchema,
  password: z
    .string("Choose a password.")
    .min(8, "Use at least 8 characters.")
    .max(200, "Keep the password under 200 characters."),
  name: z
    .string("Enter your name.")
    .trim()
    .min(1, "Enter your name.")
    .max(100, "Keep the name under 100 characters."),
  // The language the page was in: the new account keeps it (§16.1). None is English.
  language: LanguageSchema.optional(),
});
export type SignupInput = z.infer<typeof SignupInputSchema>;

// The body of POST /api/auth/login. No minimum beyond one character, so an old short password
// isn't refused before it's checked; the same cap as signup's, so a huge one isn't hashed.
export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: z
    .string("Enter your password.")
    .min(1, "Enter your password.")
    .max(200, "Keep the password under 200 characters."),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

// The signed-in user: what signup, login and GET /api/auth/me answer.
export const MeSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  language: LanguageSchema,
});
export type Me = z.infer<typeof MeSchema>;

// The body of PATCH /api/auth/me: the language, and nothing else (a 400 for any other field).
export const MePatchSchema = z.strictObject({ language: LanguageSchema });
export type MePatch = z.infer<typeof MePatchSchema>;

// GET /api/auth/providers: the ways to sign in besides a password. Google is on only when the
// API has its settings (§8.3).
export const ProvidersSchema = z.object({ google: z.boolean() });
export type Providers = z.infer<typeof ProvidersSchema>;
