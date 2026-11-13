import { serverMessage } from "../lib/serverMessage.tsx";

// A field's error, announced when it appears. TanStack Form keeps a list; the first is shown,
// as it's the one to fix first. The id lets the input point to it (aria-describedby). Every one
// is a shared schema's English message, from the form's own check or the API's 400, said in the
// page's language (design §16.7).
export function FieldError({ errors, id }: { errors: unknown[]; id?: string }) {
  const error = errors.find((message) => typeof message === "string");
  if (error === undefined) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-danger">
      {serverMessage(error)}
    </p>
  );
}
