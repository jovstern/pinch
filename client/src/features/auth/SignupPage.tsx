import { fieldErrors, SignupInputSchema } from "@pinch/shared";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { Link, useLocation } from "react-router";
import { TextField } from "../../components/TextField.tsx";
import { loadPage } from "../../lib/loadPage.ts";
import { Button } from "../../components/ui/Button.tsx";
import { AuthFrame } from "./AuthFrame.tsx";
import { GoogleButton } from "./GoogleButton.tsx";
import { signUp } from "./authQueries.ts";
import { nextPage } from "./nextPage.ts";
import { SubmitAlert } from "./SubmitAlert.tsx";
import { submitError } from "./submitError.ts";
import { Wordmark } from "./Wordmark.tsx";

// Sign up (design §8.3, §14), at /signup: as Log in, with a name and a new password.
export function SignupPage() {
  const { search } = useLocation();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => {
        const result = SignupInputSchema.safeParse(value);
        return result.success ? undefined : { fields: fieldErrors(result.error) };
      },
      onSubmitAsync: async ({ value }) => {
        try {
          await signUp(SignupInputSchema.parse(value));
          // Signed in: a new page, the one they asked for (design §8.3).
          loadPage(nextPage(search));
          return null;
        } catch (error) {
          return submitError(error);
        }
      },
    },
  });

  async function submit() {
    await form.handleSubmit();
    formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }

  return (
    <AuthFrame
      title="Sign up"
      logo={<Wordmark />}
      footer={
        <>
          Already have an account?{" "}
          <Link to={`/login${search}`} className="font-semibold text-accent-strong underline">
            Log in
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
          if (form.state.isSubmitting) return;
          void submit();
        }}
      >
        <form.Field name="name">
          {(field) => <TextField field={field} label="Name" autoComplete="name" />}
        </form.Field>
        <form.Field name="email">
          {(field) => <TextField field={field} label="Email" type="email" autoComplete="email" />}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <TextField
              field={field}
              label="Password"
              type="password"
              autoComplete="new-password"
              hint="At least 8 characters."
            />
          )}
        </form.Field>
        {/* As Log in; the email goes with a 409's Log in link, so it needn't be typed again. */}
        <form.Subscribe
          selector={(state) => ({
            error: state.isSubmitting ? undefined : state.errorMap.onSubmit,
            email: state.values.email,
          })}
        >
          {({ error, email }) => <SubmitAlert error={error} email={email} />}
        </form.Subscribe>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" aria-disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? "Signing up…" : "Sign up"}
            </Button>
          )}
        </form.Subscribe>
        <GoogleButton />
      </form>
    </AuthFrame>
  );
}
