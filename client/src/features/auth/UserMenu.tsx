import type { Me } from "@pinch/shared";
import { useMutation } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/DropdownMenu.tsx";
import { signedOut } from "../../lib/api.ts";
import { toastCouldntSave } from "../../lib/toasts.tsx";
import { Avatar } from "./Avatar.tsx";
import { logOut } from "./authQueries.ts";

// The avatar's menu (design §14): who is signed in, and Log out. Loaded on its first press
// (LazyUserMenu), and open as it appears.
export function UserMenu({ me }: { me: Me }) {
  // Signed out: the cache goes and the gate (SessionGate) sends the user to plain /login, as a
  // 401 does, but without the page they were on: they chose to leave.
  const logOutNow = useMutation({
    mutationFn: logOut,
    onSuccess: () => {
      signedOut(false);
    },
    onError: () => {
      toastCouldntSave(() => {
        logOutNow.mutate();
      }, "Couldn't log out");
    },
  });
  return (
    // Not modal, as RecipeMenu: a modal menu hides the page from screen readers (axe).
    <DropdownMenu modal={false} defaultOpen>
      <DropdownMenuTrigger asChild>
        <Avatar me={me} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel>
          <span className="block truncate font-semibold">{me.name}</span>
          <span className="block truncate text-sm text-text-muted">{me.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            logOutNow.mutate();
          }}
        >
          <LogOut aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
