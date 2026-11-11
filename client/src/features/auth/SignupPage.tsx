import { fieldErrors, SignupInputSchema } from "@pinch/shared";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { Link, useLocation } from "react-router";
import { TextField } from "../../components/TextField.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { AuthFrame } from "./AuthFrame.tsx";
import { setMe, signUp } from "./authQueries.ts";
import { SubmitAlert } from "./SubmitAlert.tsx";
import { submitError } from "./submitError.ts";

// Sign up (design §8.3, §14), at /signup: as Log in, with a name and a new password.
export function SignupPage() {
  const queryClient = useQueryClient();
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
          setMe(queryClient, await signUp(SignupInputSchema.parse(value)));
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
        <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
          {(error) => <SubmitAlert error={error} />}
        </form.Subscribe>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" aria-disabled={isSubmitting}>
              {isSubmitting ? "Signing up…" : "Sign up"}
            </Button>
          )}
        </form.Subscribe>
        {/* "Continue with Google" goes under here (A4, design §8.3). */}
      </form>
    </AuthFrame>
  );
}
