import { Link, useLocation } from "react-router";
import type { SubmitError } from "./submitError.ts";

// A failed Log in or Sign up (submitError), above its button, announced as it appears. TanStack
// Form types a form's error as unknown, so this checks it, as FieldError does a field's. The link
// to Log in keeps the page the user was going to (?next=), and Sign up's email, which Log in fills
// in: router state, kept out of the address (and so out of URL history, logs and Referer).
export function SubmitAlert({ error, email }: { error: unknown; email?: string }) {
  const { search } = useLocation();
  if (!isSubmitError(error)) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {error.message}
      {error.logIn && (
        <>
          {" "}
          {/* Kept whole: "Log in" never breaks over two lines. */}
          <Link
            to={`/login${search}`}
            state={{ email }}
            className="font-semibold whitespace-nowrap underline"
          >
            Log in
          </Link>
        </>
      )}
    </p>
  );
}

function isSubmitError(error: unknown): error is SubmitError {
  return typeof error === "object" && error !== null && "message" in error;
}
