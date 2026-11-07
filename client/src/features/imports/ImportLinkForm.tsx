import { fieldErrors, ImportInputSchema, ImportSchema } from "@pinch/shared";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import type { Ref } from "react";
import { Button } from "../../components/Button.tsx";
import { TextField } from "../../components/TextField.tsx";
import { ApiError, sendJson } from "../../lib/api.ts";
import { importListQuery } from "./importQueries.ts";

// The main action on / (design §14): paste a link, and the worker turns it into a draft
// (§4.1). Checked as the recipe form is (RecipeForm.tsx): on the first send, then on every
// change, with the API's own schema.
export function ImportLinkForm({ inputRef }: { inputRef: Ref<HTMLInputElement> }) {
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: { url: "" },
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: ({ value }) => {
        const result = ImportInputSchema.safeParse(value);
        return result.success ? undefined : { fields: fieldErrors(result.error) };
      },
      onSubmitAsync: async ({ value }) => {
        try {
          const input = ImportInputSchema.parse(value);
          await sendJson("POST", "/api/imports", input, ImportSchema);
          return null;
        } catch (error) {
          if (error instanceof ApiError && error.fields.url) {
            return { fields: { url: error.fields.url } };
          }
          return "We couldn't send this link. Try again.";
        }
      },
    },
    onSubmit: () => {
      // Empty for the next link; the new one shows in the list, which starts polling.
      form.reset();
      void queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
    },
  });

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        // Not disabled while sending, so focus stays on the button (as Show more).
        if (form.state.isSubmitting) return;
        void form.handleSubmit();
      }}
      className="mt-6"
    >
      <form.Field name="url">
        {(field) => (
          <TextField
            field={field}
            label="Pinch a recipe from a reel"
            inputMode="url"
            placeholder="https://…"
            hint="A link to an Instagram, Facebook or YouTube post."
            inputRef={inputRef}
          />
        )}
      </form.Field>
      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) =>
          typeof error === "string" && (
            <p role="alert" className="mt-3 text-danger">
              {error}
            </p>
          )
        }
      </form.Subscribe>
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <Button type="submit" variant="primary" aria-disabled={isSubmitting} className="mt-3">
            {isSubmitting ? "Sending…" : "Pinch it"}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
