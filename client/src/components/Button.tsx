import type { ComponentProps } from "react";
import { Slot } from "radix-ui";

// One look per kind of action, so every button and button-like link matches (styling.md).
const variants = {
  primary: "bg-accent-strong text-white hover:bg-accent-strong/90 active:bg-accent-strong/80",
  secondary: "border border-border hover:bg-border/40 active:bg-border/60",
  danger: "bg-danger text-white hover:bg-danger/90 active:bg-danger/80",
  // A destructive action that only opens a question: it shouldn't shout.
  "danger-quiet": "text-danger hover:bg-danger/10 active:bg-danger/20",
};

type ButtonProps = ComponentProps<"button"> & {
  variant: keyof typeof variants;
  // Render the child instead (a Link, a Radix trigger) with these styles (Radix Slot).
  asChild?: boolean;
};

export function Button({ variant, asChild = false, className = "", ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      className={`inline-flex min-h-11 items-center justify-center rounded-lg px-4 font-semibold disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
