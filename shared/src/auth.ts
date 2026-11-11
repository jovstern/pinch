import { z } from "zod";

// Accounts (design §8.3). Emails are kept lowercase, so one address is one account whatever the
// case it's typed in.
const EmailSchema = z
  .string("Enter your email.")
  .trim()
  .toLowerCase()
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

// The body of POST /api/auth/login. No length rule on the password: a wrong one is a 401, not a
// hint about what passwords look like.
export const LoginInputSchema = z.object({
  email: EmailSchema,
  password: z.string("Enter your password.").min(1, "Enter your password."),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

// The signed-in user: what signup, login and GET /api/auth/me answer.
export const MeSchema = z.object({ id: z.string(), email: z.string(), name: z.string() });
export type Me = z.infer<typeof MeSchema>;
