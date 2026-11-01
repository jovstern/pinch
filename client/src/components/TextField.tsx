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
  const error = field.state.meta.errors.find((message) => typeof message === "string");
  const errorId = `${field.name}-error`;
  const inputProps = {
    id: field.name,
    name: field.name,
    value: field.state.value,
    onChange: (event: { target: { value: string } }) => {
      field.handleChange(event.target.value);
    },
    onBlur: field.handleBlur,
    "aria-invalid": error !== undefined,
    "aria-describedby": error === undefined ? undefined : errorId,
    className:
      "min-h-11 w-full rounded-lg border border-border bg-surface-raised px-3 py-2 aria-invalid:border-danger",
  };

  return (
    <div className={className}>
      <label htmlFor={field.name} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {multiline ? (
        <textarea rows={3} {...inputProps} />
      ) : (
        <input type="text" inputMode={inputMode} {...inputProps} />
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
