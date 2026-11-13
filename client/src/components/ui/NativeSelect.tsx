import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's NativeSelect (D26), on Pinch's tokens and the Input's look: a native <select>, so
// the platform draws its list (no JS of its own), with the chevron drawn by us in place of the
// browser's. The focus ring is globals.css's :focus-visible, as on the Input.
export function NativeSelect({ className, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        className={cn(
          "h-11 w-full min-w-0 appearance-none rounded-control border border-input bg-card ps-3 pe-9 text-base disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
