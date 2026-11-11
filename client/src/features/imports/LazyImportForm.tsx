import { lazy, Suspense, type ComponentProps } from "react";

// The paste box is its own chunk, with TanStack Form: in the entry it put the editor and cook
// mode over their first-load budget (docs/metrics/m08.md, Method note). The rest of Add recipe
// (the queue, the empty state: the page's LCP) stays in the entry.
const ImportForm = lazy(async () => ({
  default: (await import("./ImportForm.tsx")).ImportForm,
}));

export function LazyImportForm(props: ComponentProps<typeof ImportForm>) {
  return (
    // The field's own box (46 px, as measured), so nothing moves when it arrives.
    <Suspense
      fallback={
        <div aria-hidden="true" className="h-11.5 rounded-control border border-input bg-card" />
      }
    >
      <ImportForm {...props} />
    </Suspense>
  );
}
