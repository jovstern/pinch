import { useId } from "react";
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
  className?: string;
};

// A label, its input and its error, tied together (react-vite.md): the label names the input,
// and the error is announced and linked to it.
export function TextField({ field, label, multiline, inputMode, className = "" }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = field.state.meta.errors.some((message) => typeof message === "string");
  const shared = {
    id,
    name: field.name,
    value: field.state.value,
    onBlur: field.handleBlur,
    "aria-invalid": invalid,
    "aria-describedby": invalid ? errorId : undefined,
    className:
      "min-h-11 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 aria-invalid:border-danger",
  };

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={3}
          {...shared}
          onChange={(event) => {
            field.handleChange(event.target.value);
          }}
        />
      ) : (
        <input
          type="text"
          inputMode={inputMode}
          {...shared}
          onChange={(event) => {
            field.handleChange(event.target.value);
          }}
        />
      )}
      <FieldError errors={field.state.meta.errors} id={errorId} />
    </div>
  );
}
