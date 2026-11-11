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
  // For Log in and Sign up: the keyboard, hidden typing, and what the browser may fill in.
  type?: "email" | "password";
  autoComplete?: string;
  // Always shown under the input, and read with it.
  hint?: string;
  // A draft's "thing to look at" (design §14): the id of its note, which the form shows under
  // the field's row. The box is dashed while it's marked, and read with the note.
  markId?: string;
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
  type,
  autoComplete,
  hint,
  markId,
  className = "",
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const invalid = field.state.meta.errors.some((message) => typeof message === "string");
  const describedBy = [];
  if (hint && !invalid) describedBy.push(hintId);
  if (markId) describedBy.push(markId);
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
    // The form's "Go to the first" finds marked boxes by it.
    "data-marked": markId ? true : undefined,
  };
  // A dashed edge, not colour alone; red still wins when the field is invalid.
  const marked = markId ? "border-2 border-dashed border-check-mark" : "";

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
          className={`max-h-80 ${marked}`}
          onChange={(event) => {
            field.handleChange(event.target.value);
          }}
        />
      ) : (
        <Input
          inputMode={inputMode}
          type={type}
          autoComplete={autoComplete}
          className={marked}
          {...shared}
          onChange={(event) => {
            field.handleChange(event.target.value);
          }}
        />
      )}
      {/* Not beside an error: the error says it again ("Use at least 8 characters."). */}
      {hint && !invalid && (
        <p id={hintId} className="mt-1 text-sm text-text-muted">
          {hint}
        </p>
      )}
      <FieldError errors={field.state.meta.errors} id={errorId} />
    </div>
  );
}
