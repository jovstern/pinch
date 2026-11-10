import type { ComponentProps } from "react";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's Skeleton (D26): the shape of what's coming, pulsing (still when the system asks
// for less motion).
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-control bg-muted motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}
