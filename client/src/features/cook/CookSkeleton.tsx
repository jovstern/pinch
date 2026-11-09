// While cook mode loads (its chunk, then the recipe): the step's shape, so the page doesn't jump
// from one line of text to the step. Said once for screen readers; the shapes are hidden.
export function CookSkeleton() {
  return (
    <>
      <p className="sr-only">Loading the recipe…</p>
      <div aria-hidden="true" className="motion-safe:animate-pulse">
        <div className="h-7 w-2/3 rounded-control bg-fill" />
        <div className="mt-10 h-4 w-24 rounded-control bg-fill" />
        <div className="mt-4 grid max-w-prose gap-3">
          <div className="h-8 rounded-control bg-fill" />
          <div className="h-8 rounded-control bg-fill" />
          <div className="h-8 w-1/2 rounded-control bg-fill" />
        </div>
      </div>
    </>
  );
}
