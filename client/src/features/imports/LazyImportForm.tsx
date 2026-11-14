import { Sparkles } from "lucide-react";
import { lazy, Suspense, type ComponentProps } from "react";
import { Button } from "../../components/ui/Button.tsx";

// The paste box is its own chunk, with TanStack Form: in the entry it put the editor and cook
// mode over their first-load budget (docs/metrics/m08.md, Method note). The rest of Add recipe
// (the queue) stays in the entry.
const ImportForm = lazy(async () => ({
  default: (await import("./ImportForm.tsx")).ImportForm,
}));

export function LazyImportForm(props: ComponentProps<typeof ImportForm>) {
  return (
    // The field's own box (46 px, as measured), so nothing moves when it arrives, with its
    // sparkles, placeholder and Pinch it where the field puts them, left to right and in English
    // in Hebrew too (design §16.4, §16.8): with an empty queue those words are the page's LCP, and here they paint
    // with the entry, not after this chunk (docs/metrics/m09.md, Miss 1). Hidden: the field
    // reads them once it's there.
    <Suspense
      fallback={
        <div
          aria-hidden="true"
          dir="ltr"
          className="relative flex h-11.5 items-center overflow-hidden rounded-control border border-input bg-card ps-6 whitespace-nowrap text-muted-foreground"
        >
          <Sparkles className="absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <span lang="en" className="flex-1 overflow-hidden px-3">
            Paste a video or a recipe
          </span>
          <Button asChild className="-my-px -me-px shrink-0 self-stretch rounded-s-none">
            <span lang="en">Pinch it</span>
          </Button>
        </div>
      }
    >
      <ImportForm {...props} />
    </Suspense>
  );
}
