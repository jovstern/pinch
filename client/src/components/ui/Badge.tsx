import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn.ts";

// shadcn/ui's Badge (D26), on Pinch's tokens: a small label that isn't a control (a tag, a
// count). Full round, like every chip (plan §6).
const badgeVariants = cva(
  "inline-flex w-fit items-center justify-center gap-1 rounded-full px-3 py-1 text-sm",
  {
    variants: {
      variant: {
        // A count that wants attention (drafts ready to review).
        default: "bg-primary text-primary-foreground",
        // A tag.
        secondary: "bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

type BadgeProps = ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
