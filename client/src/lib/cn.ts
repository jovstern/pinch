import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Pinch's own radius and shadow names (globals.css), so tailwind-merge knows `rounded-full`
// replaces `rounded-control` rather than keeping both.
const twMerge = extendTailwindMerge({
  extend: { theme: { radius: ["card", "control"], shadow: ["sheet"] } },
});

// shadcn/ui's helper (D26): joins class names, and a class passed in (className) wins over the
// component's own one for the same property.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
