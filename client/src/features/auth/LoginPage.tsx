import { fieldErrors, LoginInputSchema } from "@pinch/shared";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router";
import { TextField } from "../../components/TextField.tsx";
import { loadPage } from "../../lib/loadPage.ts";
import { Button } from "../../components/ui/Button.tsx";
import { AuthFrame } from "./AuthFrame.tsx";
import { GoogleButton } from "./GoogleButton.tsx";
import { LanguageSwitch } from "./LanguageSwitch.tsx";
import { logIn } from "./authQueries.ts";
import { nextPage } from "./nextPage.ts";
import { SubmitAlert } from "./SubmitAlert.tsx";
import { submitError } from "./submitError.ts";
import { Wordmark } from "./Wordmark.tsx";

// Log in (design §8.3, §14), at /login. Checked as every form is (RecipeForm): on the first
// submit, then on every change, with the API's own schema; then the API's answer.
export function LoginPage() {
  const location = useLocation();
  const { search } = location;
  // From Sign up's "already uses this email" link: the email they typed, so only the password is
  // left to type. Router state, not the address: it stays out of the URL, so out of the address
  // bar's history, server logs and Referer. Typed any by the router, as in useHeadingFocus.
  const state: unknown = location.state;
  const email = typeof state === "object" && state !== null && "email" in state && state.email;
  const knownEmail = typeof email === "string" ? email : "";
  // ?next= (the page the user was going to) goes with them to Sign up; a failed Google sign-in's
  // ?error= and ?reason= don't: that message is Log in's.
  const signupQuery = new URLSearchParams(search);
  signupQuery.delete("error");
  signupQuery.delete("reason");
  const signupLink = signupQuery.size > 0 ? `/signup?${signupQuery.toString()}` : "/signup";
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm({
    defaultValues: { email: knownEmail, password: "" },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => {
        const result = LoginInputSchema.safeParse(value);
        return result.success ? undefined : { fields: fieldErrors(result.error) };
      },
      onSubmitAsync: async ({ value }) => {
        try {
          await logIn(LoginInputSchema.parse(value));
          // Signed in: a new page, the one they asked for (design §8.3).
          loadPage(nextPage(search));
          return null;
        } catch (error) {
          return submitError(error);
        }
      },
    },
  });

  // An effect: focus is the DOM's. With the email filled in, the password is what's left.
  useEffect(() => {
    if (knownEmail) formRef.current?.querySelector<HTMLElement>("[name=password]")?.focus();
  }, [knownEmail]);

  async function submit() {
    await form.handleSubmit();
    // ui-craft: after a failed submit, focus moves to the first field to fix (as RecipeForm).
    formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }

  return (
    <AuthFrame
      title="Log in"
      logo={<Wordmark />}
      languageSwitch={<LanguageSwitch />}
      footer={
        <>
          New to Pinch?{" "}
          <Link to={signupLink} className="font-semibold text-accent-strong underline">
            Sign up
          </Link>
        </>
      }
    >
      <form
        ref={formRef}
        noValidate
        className="mt-6 grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          // Not disabled while sending, so focus stays on the button (as Pinch it).
          if (form.state.isSubmitting) return;
          void submit();
        }}
      >
        <form.Field name="email">
          {(field) => <TextField field={field} label="Email" type="email" autoComplete="email" />}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <TextField
              field={field}
              label="Password"
              type="password"
              autoComplete="current-password"
            />
          )}
        </form.Field>
        {/* The last try's error goes while the next is sent: it may no longer be true. */}
        <form.Subscribe
          selector={(state) => (state.isSubmitting ? undefined : state.errorMap.onSubmit)}
        >
          {(error) => <SubmitAlert error={error} />}
        </form.Subscribe>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" aria-disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "Logging in…" : "Log in"}
            </Button>
          )}
        </form.Subscribe>
        <GoogleButton />
      </form>
    </AuthFrame>
  );
}
