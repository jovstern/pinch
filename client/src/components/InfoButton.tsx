import { Info } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "./ui/Button.tsx";

// An (i) that opens a few lines of help (InfoPopover), named by what it explains. A small icon
// with no surface, so it reads as a note on what it sits beside, not a button of its own (the
// user's call, 2026-11-25); its touch area is still 44 px (the after:, 24 + 2 × 10). The other
// props are its popover's (Radix's trigger, or LazyInfoPopover's stand-in).
export function InfoButton({ label, ...props }: { label: string } & ComponentProps<"button">) {
  return (
    <Button
      type="button"
      variant="link"
      aria-label={label}
      aria-haspopup="dialog"
      className="relative size-6 min-h-0 shrink-0 px-0 text-muted-foreground no-underline after:absolute after:-inset-2.5 hover:not-aria-disabled:text-foreground"
      {...props}
    >
      <Info aria-hidden="true" className="size-4" />
    </Button>
  );
}
