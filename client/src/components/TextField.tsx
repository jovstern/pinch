import { useId, type Ref } from "react";
import { FieldError } from "./FieldError.tsx";

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
  multiline?: boolean;
  // "numeric" for numbers: a text input with the number keyboard, so nothing typed is lost.
  inputMode?: "numeric";
  // Always shown under the input, and read with it.
  hint?: string;
  // The textarea itself (multiline only: the paste box on /), to move focus to it.
  inputRef?: Ref<HTMLTextAreaElement>;
  className?: string;
};

// A label, its input and its error, tied together (react-vite.md): the label names the input,
// and the error is announced and linked to it.
export function TextField({
  field,
  label,
  multiline,
  inputMode,
  hint,
  inputRef,
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
    // Hebrew reads right to left, English left to right: each box follows what's typed in it.
    dir: "auto",
    onBlur: field.handleBlur,
    "aria-invalid": invalid,
    "aria-describedby": describedBy.length > 0 ? describedBy.join(" ") : undefined,
  };
  const box =
    "w-full rounded-lg border border-border bg-surface-raised px-3 py-2 aria-invalid:border-danger";

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {multiline ? (
        // Grows with its text (field-sizing), so a long step is read whole; up to a limit, so a long
        // pasted caption doesn't push the button below it far off the screen.
        <textarea
          ref={inputRef}
          {...shared}
          className={`field-sizing-content max-h-80 min-h-24 ${box}`}
          onChange={(event) => {
            field.handleChange(event.target.value);
          }}
        />
      ) : (
        <input
          type="text"
          inputMode={inputMode}
          {...shared}
          className={`min-h-11 ${box}`}
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
