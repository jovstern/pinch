import { useId } from "react";
import { FieldError } from "./FieldError.tsx";
import { Input } from "./ui/Input.tsx";
import { Textarea } from "./ui/Textarea.tsx";

// What TextField needs from a TanStack Form field, so it fits any text field of any form.
type TextFieldApi = {
  name: string;
  state: { value: string; meta: { errors: unknown[] } };
  handleChange: (value: string) => void;
  handleBlur: () => void;
};

type TextFieldProps = {
  field: TextFieldApi;
  label: string;
  // For a row of boxes under column names (a recipe's ingredients): read, not shown.
  hideLabel?: boolean;
  // An example, not instructions: the label says what goes in.
  placeholder?: string;
  multiline?: boolean;
  // "numeric" for numbers: a text input with the number keyboard, so nothing typed is lost.
  inputMode?: "numeric";
  // Always shown under the input, and read with it.
  hint?: string;
  className?: string;
};

// A label, its input and its error, tied together (react-vite.md): the label names the input,
// and the error is announced and linked to it.
export function TextField({
  field,
  label,
  hideLabel,
  placeholder,
  multiline,
  inputMode,
  hint,
  className = "",
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const invalid = field.state.meta.errors.some((message) => typeof message === "string");
  const describedBy = [];
  if (hint) describedBy.push(hintId);
  if (invalid) describedBy.push(errorId);
  const shared = {
    id,
    name: field.name,
    value: field.state.value,
    placeholder,
    // Hebrew reads right to left, English left to right: each box follows what's typed in it.
    dir: "auto",
    onBlur: field.handleBlur,
    "aria-invalid": invalid,
    "aria-describedby": describedBy.length > 0 ? describedBy.join(" ") : undefined,
  };
  // Focused (the first error after Save) or scrolled to, a box stays clear of the editor's Save
  // bar, pinned to the bottom on a phone.
  const clearOfSaveBar = "scroll-mb-36 lg:scroll-mb-0";

  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "mb-1 block text-sm font-semibold"}>
        {label}
      </label>
      {multiline ? (
        // Up to a limit, so a long pasted caption doesn't push the button below it far off the
        // screen.
        <Textarea
          {...shared}
          className={`max-h-80 ${clearOfSaveBar}`}
          onChange={(event) => {
            field.handleChange(event.target.value);
          }}
        />
      ) : (
        <Input
          inputMode={inputMode}
          className={clearOfSaveBar}
          {...shared}
          onChange={(event) => {
            field.handleChange(event.target.value);
          }}
        />
      )}
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-text-muted">
          {hint}
        </p>
      )}
      <FieldError errors={field.state.meta.errors} id={errorId} />
    </div>
  );
}
