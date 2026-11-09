import { dailyLimitMessage, ImportInputSchema, ImportSchema } from "@pinch/shared";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Clipboard } from "lucide-react";
import { useId, useRef, useState, type RefObject } from "react";
import { FieldError } from "../../components/FieldError.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { Textarea } from "../../components/ui/Textarea.tsx";
import { ApiError, sendJson } from "../../lib/api.ts";
import { cn } from "../../lib/cn.ts";
import { importListQuery } from "./importQueries.ts";

// Paste reads the clipboard, where the browser lets a page ask for it (a secure page, and not
// every browser).
const canPaste = "clipboard" in navigator && "readText" in navigator.clipboard;

// The main action on / (design §14): paste a link, or a post's text when its link can't be read
// (§1), and the worker turns it into a draft (§4.1). One line (Paste · the field · Pinch it) that
// grows into a box once the text wraps. Checked as the recipe form is (RecipeForm.tsx): on the
// first send, then on every change, with the API's own schema.
export function ImportForm({ inputRef }: { inputRef: RefObject<HTMLTextAreaElement | null> }) {
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const errorId = `${id}-error`;
  const [grown, setGrown] = useState(false);
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
      // Empty for the next one, and one line again; the new import shows in the queue, which
      // starts polling.
      form.reset();
      setGrown(false);
      void queryClient.invalidateQueries({ queryKey: importListQuery.queryKey });
    },
  });

  async function submit() {
    await form.handleSubmit();
    // Refused: focus goes back to the box, to fix it (ui-craft; as RecipeForm).
    formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }

  // Measured as the text changes, while the box is one line (wrap="off": it scrolls sideways):
  // a text grows the box once it has a new line or no longer fits. A link stays one line, as
  // there's nothing in it to read. Grown, it stays so until it's empty, so it doesn't flick back
  // when the wider box fits the text on one line again.
  function updateGrown(box: HTMLTextAreaElement) {
    const isText = importInput(box.value).type === "text";
    const wraps = box.value.includes("\n") || box.scrollWidth > box.clientWidth;
    setGrown(box.value !== "" && (grown || (isText && wraps)));
  }

  // Into the field, not sent: there's no Undo for a send yet (M8 F4), so the user sends it.
  async function paste(setValue: (value: string) => void) {
    const box = inputRef.current;
    if (!box) return;
    try {
      const text = await navigator.clipboard.readText();
      setValue(text);
      // Measured now, before React renders the new text into the box.
      box.value = text;
      updateGrown(box);
    } catch {
      // Refused (the user said no, or the clipboard holds no text): nothing to say; the field
      // gets focus, to paste into by hand.
    }
    box.focus();
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
              {/* The placeholder changes with the screen, so the label names the field. */}
              <label htmlFor={id} className="sr-only">
                Pinch a recipe from a reel
              </label>
              {/* shadcn's input group: the group draws the field's edge and focus ring, the
                  textarea inside has none. Grown, the box takes the first row and the buttons
                  sit under it. */}
              <div
                className={cn(
                  "flex rounded-control border border-input bg-card has-[[aria-invalid=true]]:border-destructive has-[textarea:focus-visible]:outline-2 has-[textarea:focus-visible]:outline-offset-2 has-[textarea:focus-visible]:outline-ring",
                  grown ? "flex-wrap" : "items-center",
                )}
              >
                {canPaste && (
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label="Paste"
                    className="w-11 shrink-0 px-0 text-muted-foreground"
                    onClick={() => void paste(field.handleChange)}
                  >
                    <Clipboard aria-hidden="true" className="size-5" />
                  </Button>
                )}
                <div className={cn("relative min-w-0 flex-1", grown && "order-first basis-full")}>
                  <Textarea
                    ref={inputRef}
                    id={id}
                    name={field.name}
                    value={field.state.value}
                    rows={1}
                    wrap={grown ? "soft" : "off"}
                    // Hebrew reads right to left: the box follows what's typed in it.
                    dir="auto"
                    aria-invalid={invalid}
                    aria-describedby={invalid ? errorId : undefined}
                    // The group shows focus (style: the global focus ring is unlayered, so a
                    // class can't remove it).
                    style={{ outline: "none" }}
                    className={cn(
                      "min-h-0 resize-none rounded-none border-0 bg-transparent",
                      grown
                        ? "max-h-[calc(6lh+1rem)]"
                        : "field-sizing-fixed h-11 overflow-hidden py-2.5",
                    )}
                    onChange={(event) => {
                      field.handleChange(event.target.value);
                      updateGrown(event.target);
                    }}
                    onBlur={field.handleBlur}
                    onKeyDown={(event) => {
                      // Enter sends; Shift+Enter makes a new line, for a pasted text's own
                      // lines. Not while an input method is composing a word.
                      if (event.key !== "Enter" || event.shiftKey) return;
                      if (event.nativeEvent.isComposing) return;
                      event.preventDefault();
                      formRef.current?.requestSubmit();
                    }}
                  />
                  {/* The placeholder, short on a phone, long from 768 px, cut with an
                      ellipsis if it still doesn't fit (a textarea's own would wrap). */}
                  {field.state.value === "" && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-3 top-2.5 truncate text-muted-foreground"
                    >
                      <span className="md:hidden">Paste a link or recipe text</span>
                      <span className="hidden md:inline">
                        Paste a YouTube short, a Facebook or Instagram reel, or a recipe as text
                      </span>
                    </span>
                  )}
                </div>
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button
                      type="submit"
                      aria-disabled={isSubmitting}
                      // One line: attached to the group's right edge. Grown: the bottom right.
                      className={cn(
                        "shrink-0",
                        grown ? "m-1.5 ml-auto" : "-my-px -mr-px self-stretch rounded-l-none",
                      )}
                    >
                      {isSubmitting ? "Sending…" : "Pinch it"}
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
        {(error) =>
          typeof error === "string" && (
            <p role="alert" className="mt-1 text-sm text-danger">
              {error}
            </p>
          )
        }
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
