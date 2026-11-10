import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's Textarea (D26), on Pinch's tokens: Input's box, several lines. It grows with its
// text (field-sizing), so a long step is read whole.
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "field-sizing-content min-h-24 w-full rounded-control border border-input bg-card px-3 py-2 text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
