import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <>
      <title>Page not found · Pinch</title>
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">Page not found</h1>
      <p className="mt-3 text-pretty text-text-muted">There is nothing at this address.</p>
      <Link to="/recipes" className="mt-3 inline-block font-semibold text-accent-strong underline">
        Back to My recipes
      </Link>
    </>
  );
}
