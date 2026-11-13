import {
  fieldErrors,
  RecipeInputSchema,
  type Recipe,
  type RecipeInput,
  type UncertainField,
} from "@pinch/shared";
import { revalidateLogic, useForm, useSelector } from "@tanstack/react-form";
import { Plus, X } from "lucide-react";
import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/ui/Button.tsx";
import { ErrorBoundary } from "../../components/ErrorBoundary.tsx";
import { FieldError } from "../../components/FieldError.tsx";
import { TextField } from "../../components/TextField.tsx";
import { ApiError } from "../../lib/api.ts";
import { thingsToLookAt } from "../../lib/thingsToLookAt.ts";
import { emptyIngredient, toInput, type RecipeFormValues } from "./recipeFormValues.ts";
import { RecipeSource } from "./RecipeSource.tsx";
import { RecipeTags } from "./RecipeTags.tsx";

// The question is its own chunk (Radix's AlertDialog), fetched on the press of Cancel or Discard,
// as DeleteRecipeDialog is: with Add tag's sheet, Radix's dialog was ~12 kB of the editor's
// first load, for a question most edits never ask (docs/metrics/m08.md). No busy cue on the
// button while it loads, as for Filters (FiltersButton).
const LeaveDialog = lazy(async () => ({
  default: (await import("./LeaveDialog.tsx")).LeaveDialog,
}));

// The way out beside Save: Cancel, back to an address, or a draft's Discard, which deletes it.
type Leave =
  { kind: "cancel"; to: string } | { kind: "discard"; discard: () => void; discarding: boolean };

type RecipeFormProps = {
  defaultValues: RecipeFormValues;
  // Shown, not edited: the API keeps a recipe's source and picture (D20), and has no upload.
  source: Recipe["source"];
  picture?: ReactNode;
  // At the top of the left column: a draft's banner (Review).
  intro?: ReactNode;
  // A draft's things to look at (design §14): only Review has them.
  uncertain?: UncertainField[];
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
  intro,
  uncertain = [],
  submitLabel,
  leave,
  save,
}: RecipeFormProps) {
  // The marks still to look at, by field name, each with its reason. Changing a field clears
  // its mark (the form's listener below); removing a row moves the marks of the rows under it.
  const [marks, setMarks] = useState(() =>
    toFieldNames(Object.fromEntries(uncertain.map((mark) => [mark.path, mark.reason]))),
  );
  const marksId = useId();
  // The id of a marked field's note, which its box points to (aria-describedby).
  const markId = (name: string) => (marks[name] === undefined ? undefined : `${marksId}-${name}`);
  // The notes of a row's marked fields, under the row: a note under a narrow box (an amount,
  // Serves) would wrap a word to a line. ◆ and the words, not colour alone.
  const markNotes = (names: string[], className = "") =>
    names.map((name) => {
      const reason = marks[name];
      if (reason === undefined) return null;
      return (
        <p
          key={name}
          id={markId(name)}
          className={`flex gap-1.5 text-sm text-muted-foreground ${className}`}
        >
          <span aria-hidden="true" className="text-check-mark">
            ◆
          </span>
          <span className="sr-only">To look at:</span> <span dir="auto">{reason}</span>
        </p>
      );
    });
  const lookAtCount = Object.keys(marks).length;
  const formRef = useRef<HTMLFormElement>(null);
  // Where focus goes when the last row's ✕ takes itself away (any other row's ✕ stays, as the
  // row after it moves up under it).
  const addIngredientRef = useRef<HTMLButtonElement>(null);
  const addStepRef = useRef<HTMLButtonElement>(null);
  const form = useForm({
    defaultValues,
    // Checked on the first Save, then on every change after it (TanStack's revalidateLogic):
    // the errors always describe the form as it is now, and clear as each one is fixed.
    validationLogic: revalidateLogic(),
    // A changed field has been looked at: its mark goes. (A list's own change, a row added or
    // removed, names the list, which has no mark.)
    listeners: {
      onChange: ({ fieldApi }: { fieldApi: { name: string } }) => {
        setMarks((current) => withoutMark(current, fieldApi.name));
      },
    },
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

  // Anything typed, ticked, added or removed that isn't as it was when the form opened.
  const changed = useSelector(form.store, (state) => !state.isDefaultValue);
  // An effect: the browser's own "Leave site?" when the tab is closed or reloaded with changes.
  // Links inside the app don't ask: that needs a data router's useBlocker, and Pinch's router is
  // declarative (D21). Cancel and Discard ask instead (LeaveButton).
  useEffect(() => {
    if (!changed) return;
    const ask = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", ask);
    return () => {
      window.removeEventListener("beforeunload", ask);
    };
  }, [changed]);

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
      // Room at the bottom on a phone, so the pinned Save bar (its buttons, the lines above them
      // and the home bar) never covers the last step.
      className="mt-4 grid gap-8 pb-[calc(10rem+env(safe-area-inset-bottom))] lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12 lg:pb-0"
    >
      {/* What you edit most, on the left from 1024 px; the rest beside it (design §14). In this
          order on a phone too, so the keyboard and the eye go the same way on every width. */}
      <div className="grid gap-8">
        {/* The picture first on a phone, as on the recipe's page; beside, in the right column,
            from 1024 px. */}
        {picture && <div className="lg:hidden">{picture}</div>}
        {intro && (
          <div className="grid gap-2">
            {intro}
            {lookAtCount > 0 && (
              <p className="flex flex-wrap items-center gap-x-2 text-sm">
                <span>
                  <span aria-hidden="true" className="text-check-mark">
                    ◆
                  </span>{" "}
                  {thingsToLookAt(lookAtCount)}, marked below
                </span>
                {/* As a link looks: it moves focus, as a skip link does. */}
                <button
                  type="button"
                  className="min-h-11 font-semibold text-accent-strong underline underline-offset-4"
                  onClick={() => {
                    formRef.current?.querySelector<HTMLElement>("[data-marked]")?.focus();
                  }}
                >
                  Go to the first
                </button>
              </p>
            )}
          </div>
        )}
        <div className="grid gap-1">
          <form.Field name="title">
            {(field) => (
              <TextField
                field={field}
                label="Title"
                placeholder="e.g. Red lentil soup"
                markId={markId("title")}
              />
            )}
          </form.Field>
          {markNotes(["title"])}
        </div>
        <form.Field name="description">
          {(field) => <TextField field={field} label="Description" multiline />}
        </form.Field>

        <form.Field name="ingredients" mode="array">
          {(list) => (
            // More space between rows than inside one, where a row takes two lines (a phone).
            <fieldset className="grid gap-3 sm:gap-2">
              <legend className="mb-3 font-display text-xl font-semibold">Ingredients</legend>
              <FieldError errors={list.state.meta.errors} />
              {/* The columns' names, once over the rows (each box is named for screen readers
                  too). The note has its own line on a phone, named by its placeholder. */}
              <div aria-hidden="true" className={`${ingredientColumns} text-sm font-semibold`}>
                <span>Amount</span>
                <span>Unit</span>
                <span>Ingredient</span>
                <span className="hidden sm:block">Note</span>
              </div>
              {list.state.value.map((ingredient, index) => {
                const position = String(index + 1);
                // An example while the row has no name yet (Add ingredient, a new recipe), as the
                // title's; not in a recipe's own rows, where "g" in an empty unit would mislead.
                const example = ingredient.name === "";
                // TanStack Form types the name as `ingredients[${number}]`: the index must stay a
                // number, which this rule forbids in a template.
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                const row = `ingredients[${index}]` as const;
                return (
                  // Rows have no id; the index is the row (TanStack Form names fields by it too).
                  // The recipe's own shape (design §6): amount · unit · name, and a note.
                  <fieldset key={index} className={ingredientColumns}>
                    <legend className="sr-only">Ingredient {position}</legend>
                    <form.Field name={`${row}.quantity`}>
                      {(field) => (
                        <TextField
                          field={field}
                          label="Amount"
                          hideLabel
                          placeholder={example ? "200" : undefined}
                          markId={markId(field.name)}
                        />
                      )}
                    </form.Field>
                    <form.Field name={`${row}.unit`}>
                      {(field) => (
                        <TextField
                          field={field}
                          label="Unit"
                          hideLabel
                          placeholder={example ? "g" : undefined}
                          markId={markId(field.name)}
                        />
                      )}
                    </form.Field>
                    <form.Field name={`${row}.name`}>
                      {(field) => (
                        <TextField
                          field={field}
                          label="Ingredient"
                          hideLabel
                          placeholder={example ? "e.g. flour" : undefined}
                          markId={markId(field.name)}
                        />
                      )}
                    </form.Field>
                    <form.Field name={`${row}.note`}>
                      {(field) => (
                        <TextField
                          field={field}
                          label="Note"
                          hideLabel
                          placeholder="Note (optional)"
                          className="col-span-3 col-start-1 row-start-2 sm:col-span-1 sm:col-start-auto sm:row-start-auto"
                        />
                      )}
                    </form.Field>
                    {/* A recipe needs an ingredient (§6), so the last row stays. */}
                    <RemoveButton
                      label={`Remove ingredient ${position}`}
                      disabled={list.state.value.length === 1}
                      onClick={() => {
                        const last = index === list.state.value.length - 1;
                        list.removeValue(index);
                        setMarks((current) => withoutRow(current, "ingredients", index));
                        if (last) addIngredientRef.current?.focus();
                      }}
                      className="col-start-4 row-start-1 sm:col-start-auto sm:row-start-auto"
                    />
                    {markNotes([`${row}.quantity`, `${row}.unit`, `${row}.name`], "col-span-full")}
                  </fieldset>
                );
              })}
              <AddButton
                ref={addIngredientRef}
                onClick={() => {
                  list.pushValue(emptyIngredient);
                }}
              >
                Add ingredient
              </AddButton>
            </fieldset>
          )}
        </form.Field>

        <form.Field name="steps" mode="array">
          {(list) => (
            <fieldset className="grid gap-3">
              <legend className="mb-3 font-display text-xl font-semibold">Steps</legend>
              <FieldError errors={list.state.meta.errors} />
              {list.state.value.map((_, index) => {
                const position = String(index + 1);
                // As above: the index must stay a number.
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                const step = `steps[${index}]` as const;
                return (
                  <div
                    key={index}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)_2.75rem] items-start gap-2"
                  >
                    {/* The number shows; the box's own label says it to screen readers. */}
                    <span aria-hidden="true" className="leading-11 font-semibold tabular-nums">
                      {position}
                    </span>
                    <form.Field name={step}>
                      {(field) => (
                        <TextField
                          field={field}
                          label={`Step ${position}`}
                          hideLabel
                          multiline
                          markId={markId(field.name)}
                          placeholder={
                            index === 0 ? "e.g. Rinse the lentils and soften the onion." : ""
                          }
                        />
                      )}
                    </form.Field>
                    {/* As for ingredients. */}
                    <RemoveButton
                      label={`Remove step ${position}`}
                      disabled={list.state.value.length === 1}
                      onClick={() => {
                        const last = index === list.state.value.length - 1;
                        list.removeValue(index);
                        setMarks((current) => withoutRow(current, "steps", index));
                        if (last) addStepRef.current?.focus();
                      }}
                    />
                    {markNotes([step], "col-start-2 col-span-2")}
                  </div>
                );
              })}
              <AddButton
                ref={addStepRef}
                onClick={() => {
                  list.pushValue("");
                }}
              >
                Add step
              </AddButton>
            </fieldset>
          )}
        </form.Field>
      </div>

      {/* In view as the left column scrolls, from 1024 px; it scrolls itself on a short screen,
          so Save is always within reach. */}
      <div className="grid gap-6 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:rounded-card lg:border lg:border-border lg:p-5">
        {picture && <div className="hidden lg:block">{picture}</div>}
        <p className="text-sm text-muted-foreground">
          Source: <RecipeSource source={source} />
        </p>
        <div className="grid grid-cols-3 gap-3">
          <form.Field name="servings">
            {(field) => (
              <TextField
                field={field}
                label="Serves"
                inputMode="numeric"
                markId={markId("servings")}
              />
            )}
          </form.Field>
          <form.Field name="prepMinutes">
            {(field) => (
              <TextField
                field={field}
                label="Prep (min)"
                inputMode="numeric"
                markId={markId("prepMinutes")}
              />
            )}
          </form.Field>
          <form.Field name="cookMinutes">
            {(field) => (
              <TextField
                field={field}
                label="Cook (min)"
                inputMode="numeric"
                markId={markId("cookMinutes")}
              />
            )}
          </form.Field>
          {markNotes(["servings", "prepMinutes", "cookMinutes"], "col-span-3")}
        </div>
        <form.Field name="tags">
          {(field) => (
            <RecipeTags
              selected={field.state.value}
              onChange={field.handleChange}
              errors={field.state.meta.errors}
            />
          )}
        </form.Field>

        {/* The Save bar: pinned to the bottom on a phone, in thumb reach on any length of recipe,
            above the home bar where there is one; the column's end from 1024 px. */}
        <div
          data-save-bar
          className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:border-0 lg:p-0"
        >
          {/* As wide as a phone's from 768 px, where the whole width would be a long reach. */}
          <div className="grid gap-2 md:mx-auto md:max-w-xl lg:max-w-none">
            <form.Subscribe selector={(state) => state.errorMap.onSubmit}>
              {(error) =>
                typeof error === "string" && (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                )
              }
            </form.Subscribe>
            {/* What's left to fix, by the button that needs it: the errors themselves may be far
                up the page. Each one is announced under its field, so this line isn't. */}
            <form.Subscribe selector={(state) => countErrors(state.fieldMeta)}>
              {(count) =>
                count > 0 && (
                  <p className="text-sm text-danger">
                    {count === 1 ? "1 thing" : `${String(count)} things`} to fix before saving
                  </p>
                )
              }
            </form.Subscribe>
            <form.Subscribe
              selector={(state) => ({
                isSubmitting: state.isSubmitting,
                title: state.values.title,
              })}
            >
              {({ isSubmitting, title }) => {
                // Saving and discarding a draft never run together: one or the other would find
                // it gone.
                const discarding = leave.kind === "discard" && leave.discarding;
                return (
                  <div className="flex gap-2">
                    <LeaveButton
                      leave={leave}
                      busy={isSubmitting || discarding}
                      title={title}
                      changed={changed}
                    />
                    <Button
                      type="submit"
                      disabled={isSubmitting || discarding}
                      aria-busy={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? "Saving…" : submitLabel}
                    </Button>
                  </div>
                );
              }}
            </form.Subscribe>
          </div>
        </div>
      </div>
    </form>
  );
}

type LeaveButtonProps = {
  leave: Leave;
  // Saving, or discarding already.
  busy: boolean;
  // The title as it is now, for the question.
  title: string;
  // Anything not as it was when the form opened.
  changed: boolean;
};

function LeaveButton({ leave, busy, title, changed }: LeaveButtonProps) {
  const navigate = useNavigate();
  // The question is open while it's on the page: closing takes it away.
  const [asking, setAsking] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Without changes, Cancel just goes.
  if (leave.kind === "cancel" && !changed) {
    return (
      <Button asChild variant="outline" className="w-28">
        {/* replace, as after a save: Back never returns to the form. */}
        <Link to={leave.to} replace>
          Cancel
        </Link>
      </Button>
    );
  }
  // With changes, Cancel asks first (design §14); a draft's Discard always does.
  const { button, ...question } =
    leave.kind === "cancel"
      ? {
          button: "Cancel",
          title: "Discard your changes?",
          description: "What you've changed here won't be saved.",
          confirmLabel: "Discard changes",
          keepLabel: "Keep editing",
          onConfirm: () => {
            void navigate(leave.to, { replace: true });
          },
        }
      : {
          button: leave.discarding ? "Discarding…" : "Discard",
          title: "Discard this draft?",
          description: title.trim() ? `“${title.trim()}” won't be saved.` : "It won't be saved.",
          confirmLabel: "Discard draft",
          keepLabel: "Keep reviewing",
          onConfirm: leave.discard,
        };
  return (
    <>
      {/* Not disabled while busy, so focus stays on it (as Show more): it just doesn't open. */}
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        aria-haspopup="dialog"
        aria-disabled={busy}
        aria-busy={leave.kind === "discard" && leave.discarding}
        onClick={() => {
          if (!busy) setAsking(true);
        }}
        className="w-28"
      >
        {button}
      </Button>
      {/* A question that won't load (offline, a new deploy) just doesn't open: caught here, not
          by the page's ErrorBoundary, which would replace the form and what's typed in it. */}
      {asking && (
        <ErrorBoundary fallback={null}>
          <Suspense>
            <LeaveDialog
              {...question}
              onClose={() => {
                setAsking(false);
              }}
              focusOnClose={() => buttonRef.current?.focus()}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </>
  );
}

// An ingredient's row: amount, unit and name on one line with ✕, even at 360 px; the note under
// them on a phone, beside them from 640 px. The unit wider than the amount ("tablespoons" whole
// from 640 px; on a phone the amount, a few digits, gives it what room a 360 px row has).
const ingredientColumns =
  "grid grid-cols-[3.5rem_5.5rem_minmax(0,1fr)_2.75rem] items-start gap-1.5 sm:grid-cols-[4rem_6.5rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] sm:gap-2";

// ✕, named for screen readers by the row it removes.
function RemoveButton({
  label,
  className = "",
  ...props
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-label={label}
      className={`px-0 text-muted-foreground ${className}`}
      {...props}
    >
      <X aria-hidden="true" className="size-5" />
    </Button>
  );
}

type AddButtonProps = {
  ref: Ref<HTMLButtonElement>;
  onClick: () => void;
  children: ReactNode;
};

function AddButton({ ref, onClick, children }: AddButtonProps) {
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      onClick={onClick}
      className="-ms-3 justify-self-start"
    >
      <Plus aria-hidden="true" className="size-4" />
      {children}
    </Button>
  );
}

// How many fields show an error (a row's, a list's, a box's).
function countErrors(fieldMeta: Record<string, { errors: unknown[] } | undefined>) {
  return Object.values(fieldMeta).filter((meta) =>
    meta?.errors.some((message) => typeof message === "string"),
  ).length;
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

// The marks, by field name, still to look at.
type Marks = Record<string, string>;

// The same marks, unless the field had one. The same object when it hadn't, so a keystroke in
// an unmarked field doesn't draw the form again.
function withoutMark(marks: Marks, name: string) {
  if (marks[name] === undefined) return marks;
  return Object.fromEntries(Object.entries(marks).filter(([marked]) => marked !== name));
}

// A row removed: its marks go, and each row under it moves up one, with its marks.
function withoutRow(marks: Marks, list: "ingredients" | "steps", removed: number) {
  const row = new RegExp(`^${list}\\[(\\d+)\\]`);
  return Object.fromEntries(
    Object.entries(marks).flatMap(([name, reason]) => {
      const index = Number(row.exec(name)?.[1] ?? -1);
      if (index === removed) return [];
      if (index < removed) return [[name, reason]];
      return [[name.replace(row, `${list}[${String(index - 1)}]`), reason]];
    }),
  );
}
