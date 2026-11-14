import type { ComponentProps } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's Popover (D26), on Pinch's tokens: a Radix popover (opens on a tap, a click, Enter or
// Space; Escape and a press outside close it; focus goes back to its trigger). Only the parts
// Pinch uses: a tooltip can't be opened by touch, so a hint someone asks for is a popover.
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;

export function PopoverContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  // No Portal, as DropdownMenuContent: it stays inside the page's landmarks (axe's "region"), and
  // Radix places it with position: fixed, so the boxes around it don't clip it. Focus goes to the
  // popover itself when it opens; its edge and shadow already show it, so no ring around it all
  // (important: the global focus ring is unlayered).
  return (
    <PopoverPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-control border border-border bg-popover p-4 text-popover-foreground shadow-sheet outline-none!",
        className,
      )}
      {...props}
    />
  );
}
