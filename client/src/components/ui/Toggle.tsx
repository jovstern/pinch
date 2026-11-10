import type { ComponentProps } from "react";
import { Toggle as TogglePrimitive } from "radix-ui";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's Toggle (D26), on Pinch's tokens: a button that stays pressed (aria-pressed). Drawn
// as a chip, like the tag pickers' (TagPicker): a fill at rest, the primary colour when on (with
// a ✓ from the caller, not colour alone). 40 px tall to sit lighter than a button, with a 44 px
// touch area (the after: around it).
export function Toggle({ className, ...props }: ComponentProps<typeof TogglePrimitive.Root>) {
  return (
    <TogglePrimitive.Root
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-secondary px-4 text-sm whitespace-nowrap text-secondary-foreground after:absolute after:inset-x-0 after:-inset-y-0.5 after:content-[''] hover:bg-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}
