import type { Me } from "@pinch/shared";
import type { ComponentProps } from "react";
import { Button } from "../../components/ui/Button.tsx";

// The header's avatar (design §14, D24): the first letter of the user's name in a 44 px circle. A
// button that opens their menu; the props are the menu's (Radix's trigger, or LazyUserMenu's).
export function Avatar({ me, ...props }: { me: Me } & ComponentProps<"button">) {
  return (
    <Button
      type="button"
      variant="secondary"
      aria-label="Your account"
      aria-haspopup="menu"
      className="size-11 shrink-0 rounded-full px-0 text-lg"
      {...props}
    >
      <span aria-hidden="true">{me.name.charAt(0).toUpperCase()}</span>
    </Button>
  );
}
