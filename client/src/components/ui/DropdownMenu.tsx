import type { ComponentProps } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's DropdownMenu (D26), on Pinch's tokens: a Radix menu (arrow keys, Escape, focus
// back to its trigger). Only the parts Pinch uses; items 44 px tall for touch.
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 rounded-control border border-border bg-popover p-1 text-popover-foreground shadow-sheet",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

type DropdownMenuItemProps = ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  // "destructive": for what can't be undone (Delete), in the destructive colour.
  variant?: "default" | "destructive";
};

export function DropdownMenuItem({
  className,
  variant = "default",
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex min-h-11 cursor-default items-center gap-2 rounded-[calc(var(--radius-control)-0.25rem)] px-3 outline-none select-none data-disabled:opacity-60 data-highlighted:bg-secondary [&_svg]:size-4 [&_svg]:shrink-0",
        variant === "destructive" && "text-destructive data-highlighted:bg-destructive/10",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
