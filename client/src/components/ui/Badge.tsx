import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's Badge (D26), on Pinch's tokens: a small label that isn't a control (a tag). Full
// round, like every chip (plan §6). One look for now (shadcn's secondary); its variants come
// back with the first badge that needs another.
export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground",
        className,
      )}
      {...props}
    />
  );
}
