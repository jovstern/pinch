import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's Input (D26), on Pinch's tokens: 44 px tall for touch, 16 px text (smaller makes iOS
// zoom in on focus), an edge that shows on the page (border-field), red when invalid.
export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full min-w-0 rounded-control border border-input bg-card px-3 text-base placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
