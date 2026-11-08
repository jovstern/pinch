import { dailyLimitMessage, ImportInputSchema, ImportSchema } from "@pinch/shared";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, type Ref } from "react";
import { Button } from "../../components/Button.tsx";
import { TextField } from "../../components/TextField.tsx";
import { ApiError, sendJson } from "../../lib/api.ts";
import { importListQuery } from "./importQueries.ts";

// The main action on / (design §14): paste a link, or a post's text when its link can't be read
// (§1), and the worker turns it into a draft (§4.1). Checked as the recipe form is
// (RecipeForm.tsx): on the first send, then on every change, with the API's own schema.
export function ImportForm({ inputRef }: { inputRef: Ref<HTMLTextAreaElement> }) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm({
    defaultValues: { pasted: "" },
    validationLogic: revalidateLogic(),
    validators: {
      // One field for both inputs, so its first message, whichever input it is.
      onDynamic: ({ value }) => {
        const result = ImportInputSchema.safeParse(importInput(value.pasted));
        return result.success ? undefined : { fields: { pasted: result.error.issues[0]?.message } };
      },
      onSubmitAsync: async ({ value }) => {
        try {
          const input = ImportInputSchema.parse(importInput(value.pasted));
          await sendJson("POST", "/api/imports", input, ImportSchema);
          return null;
        } catch (error) {
          if (error instanceof ApiError) {
            const message = error.fields.url ?? error.fields.text;
            if (message) return { fields: { pasted: message } };
            // Past the day's cap (design §1): what was pasted is fine, so not on the field.
            if (error.status === 429) return dailyLimitMessage;
          }
          return "We couldn't send this. Try again.";
        }
      },
    },
    onSubmit: () => {
      // Empty for the next one; the new import shows in the list, which starts polling.
      form.reset();
      void queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
    },
  });

  async function submit() {
    await form.handleSubmit();
    // Refused: focus goes back to the box, to fix it (ui-craft; as RecipeForm).
    formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        // Not disabled while sending, so focus stays on the button (as Show more).
        if (form.state.isSubmitting) return;
        void submit();
      }}
      className="mt-6"
    >
      <form.Field name="pasted">
        {(field) => (
          <TextField
            field={field}
            label="Pinch a recipe from a reel"
            multiline
            hint="A link to an Instagram, Facebook or YouTube post, or the recipe's text."
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

// One box for both (design §14), so there's nothing to choose: a link is one word, and anything
// with a space or a new line in it is the recipe's text. A link from another site is still a
// link, and is refused as one.
function importInput(pasted: string) {
  return /\s/.test(pasted.trim())
    ? { type: "text" as const, text: pasted }
    : { type: "link" as const, url: pasted };
}
