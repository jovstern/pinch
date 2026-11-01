import { fieldErrors, RecipeInputSchema, type RecipeInput } from "@pinch/shared";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useRef } from "react";
import { Link } from "react-router";
import { Button } from "../../components/Button.tsx";
import { FieldError } from "../../components/FieldError.tsx";
import { TextField } from "../../components/TextField.tsx";
import { ApiError } from "../../lib/api.ts";
import { emptyIngredient, toInput, type RecipeFormValues } from "./recipeFormValues.ts";

type RecipeFormProps = {
  defaultValues: RecipeFormValues;
  submitLabel: string;
  cancelTo: string;
  // Sends the recipe; the page that owns the form decides where to go once it's saved.
  save: (input: RecipeInput) => Promise<unknown>;
};

export function RecipeForm({ defaultValues, submitLabel, cancelTo, save }: RecipeFormProps) {
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
      className="mt-6 grid gap-6"
    >
      <form.Field name="title">{(field) => <TextField field={field} label="Title" />}</form.Field>
      <form.Field name="description">
        {(field) => <TextField field={field} label="Description" multiline />}
      </form.Field>

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

      <form.Field name="ingredients" mode="array">
        {(list) => (
          <fieldset className="mt-4 grid gap-4">
            <legend className="mb-3 text-xl font-semibold">Ingredients</legend>
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
            <legend className="mb-3 text-xl font-semibold">Steps</legend>
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

      <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
        {(error) =>
          typeof error === "string" && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )
        }
      </form.Subscribe>

      <div className="flex gap-3">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : submitLabel}
            </Button>
          )}
        </form.Subscribe>
        <Button asChild variant="secondary">
          {/* replace, as after a save: Back never returns to the form. */}
          <Link to={cancelTo} replace>
            Cancel
          </Link>
        </Button>
      </div>
    </form>
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
