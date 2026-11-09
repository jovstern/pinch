import { fieldErrors, RecipeInputSchema, type Recipe, type RecipeInput } from "@pinch/shared";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useRef, type ReactNode } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/Button.tsx";
import { FieldError } from "../../components/FieldError.tsx";
import { TextField } from "../../components/TextField.tsx";
import { ApiError } from "../../lib/api.ts";
import { LeaveDialog } from "./LeaveDialog.tsx";
import { emptyIngredient, toInput, type RecipeFormValues } from "./recipeFormValues.ts";
import { RecipeSource } from "./RecipeSource.tsx";
import { TagPicker } from "./TagPicker.tsx";

// The way out beside Save: Cancel, back to an address, or a draft's Discard, which deletes it.
type Leave =
  | { kind: "cancel"; to: string }
  | { kind: "discard"; title: string; discard: () => void; discarding: boolean };

type RecipeFormProps = {
  defaultValues: RecipeFormValues;
  // Shown, not edited: the API keeps a recipe's source and picture (D20), and has no upload.
  source: Recipe["source"];
  picture?: ReactNode;
  submitLabel: string;
  leave: Leave;
  // Sends the recipe; the page that owns the form decides where to go once it's saved.
  save: (input: RecipeInput) => Promise<unknown>;
};

// One editor for three jobs (design §14): writing a recipe, editing one, reviewing a draft. The
// pages give it what differs: the values, the source and picture, Save's label and the way out.
export function RecipeForm({
  defaultValues,
  source,
  picture,
  submitLabel,
  leave,
  save,
}: RecipeFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const form = useForm({
    defaultValues,
    // Checked on the first Save, then on every change after it (TanStack's revalidateLogic):
    // the errors always describe the form as it is now, and clear as each one is fixed.
    validationLogic: revalidateLogic(),
    validators: {
      // With the API's own schema, so the messages are the ones the API would send (§8.1).
      onDynamic: ({ value }) => {
        const result = RecipeInputSchema.safeParse(toInput(value));
        return result.success ? undefined : { fields: toFieldNames(fieldErrors(result.error)) };
      },
      // Then the save itself, the last check: its 400 names fields the same way. It lives here,
      // not in onSubmit, because only a validator can put errors on fields.
      onSubmitAsync: async ({ value }) => {
        try {
          await save(RecipeInputSchema.parse(toInput(value)));
          return null;
        } catch (error) {
          // A 400 without fields (a body the API couldn't read) has nothing to show on a field.
          if (error instanceof ApiError && error.status === 400 && hasKeys(error.fields)) {
            return { fields: toFieldNames(error.fields) };
          }
          // A plain message is an error for the whole form, not one field.
          return "It couldn't be saved. Try again.";
        }
      },
    },
  });

  async function submit() {
    await form.handleSubmit();
    // ui-craft: after a failed submit, focus moves to the first field to fix. React has drawn
    // the errors by now: handleSubmit resolves after the store update that shows them.
    formRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      // Room at the bottom on a phone, so the pinned Save bar never covers the last step.
      className="mt-4 grid gap-8 pb-32 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12 lg:pb-0"
    >
      {/* What you edit most, on the left from 1024 px; the rest beside it (design §14). In this
          order on a phone too, so the keyboard and the eye go the same way on every width. */}
      <div className="grid gap-8">
        <form.Field name="title">{(field) => <TextField field={field} label="Title" />}</form.Field>
        <form.Field name="description">
          {(field) => <TextField field={field} label="Description" multiline />}
        </form.Field>

        <form.Field name="ingredients" mode="array">
          {(list) => (
            <fieldset className="mt-4 grid gap-4">
              <legend className="mb-3 font-display text-xl font-semibold">Ingredients</legend>
              <FieldError errors={list.state.meta.errors} />
              {list.state.value.map((_, index) => {
                const position = String(index + 1);
                // TanStack Form types the name as `ingredients[${number}]`: the index must stay a
                // number, which this rule forbids in a template.
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                const row = `ingredients[${index}]` as const;
                return (
                  // Rows have no id; the index is the row (TanStack Form names fields by it too).
                  <fieldset
                    key={index}
                    className="grid grid-cols-[5rem_5rem_1fr_auto] items-start gap-3 border-b border-border pb-4"
                  >
                    <legend className="sr-only">Ingredient {position}</legend>
                    <form.Field name={`${row}.quantity`}>
                      {(field) => <TextField field={field} label="Amount" />}
                    </form.Field>
                    <form.Field name={`${row}.unit`}>
                      {(field) => <TextField field={field} label="Unit" />}
                    </form.Field>
                    <form.Field name={`${row}.name`}>
                      {(field) => (
                        <TextField field={field} label="Ingredient" className="col-span-2" />
                      )}
                    </form.Field>
                    <form.Field name={`${row}.note`}>
                      {(field) => <TextField field={field} label="Note" className="col-span-3" />}
                    </form.Field>
                    {/* Its name says which row, for screen readers. mt-6 skips the label above the
                      inputs beside it, so it lines up with them even when one shows an error. A
                      recipe needs an ingredient (§6), so the last row stays. */}
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={`Remove ingredient ${position}`}
                      disabled={list.state.value.length === 1}
                      onClick={() => {
                        list.removeValue(index);
                      }}
                      className="mt-6"
                    >
                      Remove
                    </Button>
                  </fieldset>
                );
              })}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  list.pushValue(emptyIngredient);
                }}
                className="justify-self-start"
              >
                Add an ingredient
              </Button>
            </fieldset>
          )}
        </form.Field>

        <form.Field name="steps" mode="array">
          {(list) => (
            <fieldset className="mt-4 grid gap-4">
              <legend className="mb-3 font-display text-xl font-semibold">Steps</legend>
              <FieldError errors={list.state.meta.errors} />
              {list.state.value.map((_, index) => {
                const position = String(index + 1);
                // As above: the index must stay a number.
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                const step = `steps[${index}]` as const;
                return (
                  <div key={index} className="grid grid-cols-[1fr_auto] items-start gap-3">
                    <form.Field name={step}>
                      {(field) => <TextField field={field} label={`Step ${position}`} multiline />}
                    </form.Field>
                    {/* As for ingredients. */}
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={`Remove step ${position}`}
                      disabled={list.state.value.length === 1}
                      onClick={() => {
                        list.removeValue(index);
                      }}
                      className="mt-6"
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  list.pushValue("");
                }}
                className="justify-self-start"
              >
                Add a step
              </Button>
            </fieldset>
          )}
        </form.Field>
      </div>

      {/* In view as the left column scrolls, from 1024 px. */}
      <div className="grid gap-6 lg:sticky lg:top-4 lg:rounded-card lg:border lg:border-border lg:p-5">
        {picture}
        <p className="text-sm text-muted-foreground">
          Source: <RecipeSource source={source} />
        </p>
        <div className="grid grid-cols-3 gap-3">
          <form.Field name="servings">
            {(field) => <TextField field={field} label="Serves" inputMode="numeric" />}
          </form.Field>
          <form.Field name="prepMinutes">
            {(field) => <TextField field={field} label="Prep (min)" inputMode="numeric" />}
          </form.Field>
          <form.Field name="cookMinutes">
            {(field) => <TextField field={field} label="Cook (min)" inputMode="numeric" />}
          </form.Field>
        </div>
        <form.Field name="tags">
          {(field) => (
            <TagPicker
              legend="Tags"
              legendClassName="mb-3 font-display text-xl font-semibold"
              selected={field.state.value}
              onChange={field.handleChange}
              errors={field.state.meta.errors}
            />
          )}
        </form.Field>

        {/* The Save bar: pinned to the bottom on a phone, in thumb reach on any length of recipe,
            above the home bar where there is one; the column's end from 1024 px. */}
        <div className="fixed inset-x-0 bottom-0 z-10 grid gap-2 border-t border-border bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:border-0 lg:p-0">
          <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
            {(error) =>
              typeof error === "string" && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )
            }
          </form.Subscribe>
          <div className="flex gap-2">
            <LeaveButton leave={leave} />
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                // Not while a draft is being discarded: one or the other would find it gone.
                <Button
                  type="submit"
                  disabled={isSubmitting || (leave.kind === "discard" && leave.discarding)}
                  className="flex-1"
                >
                  {isSubmitting ? "Saving…" : submitLabel}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </div>
    </form>
  );
}

function LeaveButton({ leave }: { leave: Leave }) {
  if (leave.kind === "cancel") {
    return (
      <Button asChild variant="outline" className="w-28">
        {/* replace, as after a save: Back never returns to the form. */}
        <Link to={leave.to} replace>
          Cancel
        </Link>
      </Button>
    );
  }
  return (
    <LeaveDialog
      trigger={
        // Not disabled while it runs, so focus stays on it (as Show more).
        <Button type="button" variant="outline" aria-disabled={leave.discarding} className="w-28">
          {leave.discarding ? "Discarding…" : "Discard"}
        </Button>
      }
      title="Discard this draft?"
      description={`“${leave.title}” won't be saved.`}
      confirmLabel="Discard draft"
      keepLabel="Keep reviewing"
      onConfirm={leave.discard}
    />
  );
}

// The API names a field "ingredients.0.name"; TanStack Form names it "ingredients[0].name".
function toFieldNames(fields: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(fields).map(([path, message]) => [path.replace(/\.(\d+)/g, "[$1]"), message]),
  );
}

function hasKeys(fields: Record<string, string>) {
  return Object.keys(fields).length > 0;
}
