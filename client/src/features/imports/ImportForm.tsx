import {
  DuplicateLinkSchema,
  ImportInputSchema,
  ImportSchema,
  type DuplicateLink,
} from "@pinch/shared";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useId, useRef, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { FieldError } from "../../components/FieldError.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Input } from "../../components/ui/Input.tsx";
import { ApiError, sendJson } from "../../lib/api.ts";
import { thingsToLookAt } from "../../lib/thingsToLookAt.ts";
import {
  toastAlreadyPinching,
  toastAlreadySaved,
  toastPinching,
  toastReady,
} from "../../lib/toasts.tsx";
import { cancelImport, importListQuery, limitNote } from "./importQueries.ts";

// The main action on / (design §14): paste a link, or a post's text when its link can't be read
// (§1), and the worker turns it into a draft (§4.1). One line: the field, then Pinch it. Checked
// as the recipe form is (RecipeForm.tsx): on the first send, then on every change, with the API's
// own schema.
export function ImportForm({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  // The import just sent: the send is checked as the form's last validator, which can only say
  // whether it worked, so its id waits here for onSubmit's toast, whose Undo cancels it.
  const sentId = useRef("");
  // Or what the user already has from that link (a 409, design §4.6): a toast points to it.
  const existing = useRef<DuplicateLink["existing"]>(undefined);
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
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
        existing.current = undefined;
        try {
          const input = ImportInputSchema.parse(importInput(value.pasted));
          sentId.current = (await sendJson("POST", "/api/imports", input, ImportSchema)).id;
          return null;
        } catch (error) {
          if (error instanceof ApiError) {
            // Not an error: the field empties, as for a link sent (onSubmit).
            const duplicate = DuplicateLinkSchema.safeParse(error.body);
            if (error.status === 409 && duplicate.success) {
              existing.current = duplicate.data.existing;
              return null;
            }
            const message = error.fields.url ?? error.fields.text;
            if (message) return { fields: { pasted: message } };
            // Past the day's cap, the user's or everyone's (D22, D30): what was pasted is fine, so
            // not on the field, and kept for tomorrow; a note, not an error (below).
            const limit = limitNote(error);
            if (limit) return { note: limit };
          }
          return t("imports.couldntSend");
        }
      },
    },
    onSubmit: () => {
      // Empty for the next one; the new import shows in the queue, which starts polling.
      form.reset();
      if (existing.current) {
        showExisting(existing.current);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
      const id = sentId.current;
      toastPinching(() => cancelImport(queryClient, id));
    },
  });

  function showExisting(existing: DuplicateLink["existing"]) {
    const { id } = existing;
    if (existing.kind === "recipe") {
      toastAlreadySaved(existing.title, () => void navigate(`/recipes/${id}`));
    } else if (existing.status === "ready") {
      // The queue's own toast for it, by its id, saying the same: one, not two.
      const { title = "Your draft", lookAt = 0 } = existing;
      const review = () => void navigate(`/imports/${id}`);
      toastReady(id, title, review, lookAt > 0 ? thingsToLookAt(lookAt) : undefined);
    } else {
      toastAlreadyPinching();
    }
  }

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
    >
      <form.Field name="pasted">
        {(field) => {
          const invalid = field.state.meta.errors.some((message) => typeof message === "string");
          return (
            <>
              {/* The placeholder is short and isn't read, so the label names the field and the
                  hint says what goes in it. */}
              <label htmlFor={id} className="sr-only">
                {t("imports.pasteLabel")}
              </label>
              <p id={hintId} className="sr-only">
                {t("imports.pasteHint")}
              </p>
              {/* shadcn's input group: the group draws the field's edge and focus ring, the
                  input inside has none. The sparkles are Pinch's mark, not a control. The room
                  for them (ps-6, plus the input's own px-3) is the group's: the input is
                  dir="auto", so its own padding would follow what's typed, not the page.
                  Left to right in Hebrew too, the user's call (design §16.4): the sparkles on
                  the left, Pinch it on the right, as in English. */}
              <div
                dir="ltr"
                className="relative flex items-center rounded-control border border-input bg-card ps-6 has-[[aria-invalid=true]]:border-destructive has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-ring"
              >
                <Sparkles
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  ref={inputRef}
                  id={id}
                  name={field.name}
                  value={field.state.value}
                  // English in Hebrew too, as Pinch it (design §16.8, the user's call). Only the
                  // direction changes: empty, left to right, so the placeholder sits by the
                  // sparkles; typed in, it follows what's typed (Hebrew reads right to left). No
                  // lang: the field's name and hint are the page's language.
                  placeholder="Paste a video or a recipe"
                  dir={field.state.value === "" ? "ltr" : "auto"}
                  aria-invalid={invalid}
                  aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
                  enterKeyHint="send"
                  // The group shows focus and the edge. Important (!): the global focus ring is
                  // unlayered, so a plain utility can't remove it.
                  className="flex-1 rounded-none border-0 bg-transparent outline-none!"
                  onChange={(event) => {
                    field.handleChange(event.target.value);
                  }}
                  onBlur={field.handleBlur}
                  // A recipe's text comes with its lines, which an input would drop, gluing
                  // "2 eggs" to "1 onion": they become " · " instead, at the caret.
                  onPaste={(event) => {
                    const text = event.clipboardData.getData("text");
                    if (!/[\r\n]/.test(text)) return;
                    event.preventDefault();
                    const box = event.currentTarget;
                    const end = box.value.length;
                    box.setRangeText(
                      oneLine(text),
                      box.selectionStart ?? end,
                      box.selectionEnd ?? end,
                      "end",
                    );
                    field.handleChange(box.value);
                  }}
                  onKeyDown={(event) => {
                    // Enter sends (the form's own), but not while an input method is composing
                    // a word: that Enter picks the word.
                    if (event.key === "Enter" && event.nativeEvent.isComposing) {
                      event.preventDefault();
                    }
                  }}
                />
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button
                      type="submit"
                      aria-disabled={isSubmitting}
                      aria-busy={isSubmitting}
                      // Attached to the group's end edge.
                      className="-my-px -me-px shrink-0 self-stretch rounded-s-none"
                    >
                      {/* English in Hebrew too (§16.8, the user's call). */}
                      {isSubmitting ? t("imports.sending") : <span lang="en">Pinch it</span>}
                    </Button>
                  )}
                </form.Subscribe>
              </div>
              <FieldError errors={field.state.meta.errors} id={errorId} />
            </>
          );
        }}
      </form.Field>
      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) => (
          <>
            {typeof error === "string" && (
              <p role="alert" className="mt-1 text-sm text-destructive">
                {error}
              </p>
            )}
            {/* A day's limit: said quietly (a status, muted), as nothing went wrong. Always on
                the page, empty until then: a live region must be there before its text, or
                screen readers may miss it (as RecipeListPage's count). */}
            <p role="status" className="text-sm text-text-muted not-empty:mt-1">
              {isNote(error) && error.note}
            </p>
          </>
        )}
      </form.Subscribe>
    </form>
  );
}

// TanStack Form types a form's error as unknown, so this checks it (as FieldError does).
function isNote(error: unknown): error is { note: string } {
  return typeof error === "object" && error !== null && "note" in error;
}

// A pasted text's lines as one line: an input has no new lines. A middle dot, not a comma: a
// recipe's lines have commas of their own ("1 onion, chopped"), and the dot still reads as a
// break, to the user and to the model.
export function oneLine(text: string) {
  return text.trim().replace(/\s*[\r\n]+\s*/g, " · ");
}

// One box for both (design §14), so there's nothing to choose: a link is one word, and anything
// with a space or a new line in it is the recipe's text. A link from another site is still a
// link, and is refused as one.
function importInput(pasted: string) {
  return /\s/.test(pasted.trim())
    ? { type: "text" as const, text: pasted }
    : { type: "link" as const, url: pasted };
}
