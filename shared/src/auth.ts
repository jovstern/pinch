import { z } from "zod";

// Accounts (design §8.3). Emails are kept lowercase, so one address is one account whatever the
// case it's typed in.
const EmailSchema = z
  .string("Enter your email.")
  .trim()
  .toLowerCase()
  .min(1, "Enter your email.")
  .pipe(z.email("Enter a valid email.").max(254, "Keep the email under 254 characters."));

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
export const MeSchema = z.object({ id: z.string(), email: z.string(), name: z.string() });
export type Me = z.infer<typeof MeSchema>;

// GET /api/auth/providers: the ways to sign in besides a password. Google is on only when the
// API has its settings (§8.3).
export const ProvidersSchema = z.object({ google: z.boolean() });
export type Providers = z.infer<typeof ProvidersSchema>;
