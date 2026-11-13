import { Check } from "lucide-react";
import type { ComponentProps } from "react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's DropdownMenu (D26), on Pinch's tokens: a Radix menu (arrow keys, Escape, focus
// back to its trigger); an item can be a React Router Link (asChild). Only the parts Pinch uses;
// items 44 px tall for touch.
export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  // No Portal, unlike shadcn's: the menu stays where its trigger is, inside the page's landmarks,
  // as a menu that isn't modal must (axe's "region"; RecipeMenu). Radix places it with position:
  // fixed, so the boxes around it don't clip it.
  return (
    <DropdownMenuPrimitive.Content
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-48 rounded-control border border-border bg-popover p-1 text-popover-foreground shadow-sheet",
        className,
      )}
      {...props}
    />
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
        "flex min-h-11 cursor-default items-center gap-2 rounded-control px-3 outline-none select-none data-disabled:opacity-60 data-highlighted:bg-secondary [&_svg]:size-4 [&_svg]:shrink-0",
        variant === "destructive" && "text-destructive data-highlighted:bg-destructive/10",
        className,
      )}
      {...props}
    />
  );
}

// One choice of several (the avatar's menu's languages): the chosen one has a check at its start.
export const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

export function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      className={cn(
        "relative flex min-h-11 cursor-default items-center rounded-control ps-9 pe-3 outline-none select-none data-disabled:opacity-60 data-highlighted:bg-secondary",
        className,
      )}
      {...props}
    >
      <DropdownMenuPrimitive.ItemIndicator className="absolute start-3 flex">
        <Check aria-hidden="true" className="size-4" />
      </DropdownMenuPrimitive.ItemIndicator>
      {children}
    </DropdownMenuPrimitive.RadioItem>
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

// Words at the top of a menu that aren't a choice (who is signed in: the avatar's menu).
export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return <DropdownMenuPrimitive.Label className={cn("px-3 py-2", className)} {...props} />;
}
