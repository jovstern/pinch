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
import { loadPage } from "../../lib/loadPage.ts";
import { toastCouldntSave } from "../../lib/toasts.tsx";
import { Avatar } from "./Avatar.tsx";
import { logOut } from "./authQueries.ts";

// The avatar's menu (design §14): who is signed in, and Log out. Loaded on its first press
// (LazyUserMenu), and open as it appears.
export function UserMenu({ me }: { me: Me }) {
  // Signed out: Log in, as a new page (design §8.3: a change of user leaves nothing of the last
  // one's), and plain /login, without the page they were on: they chose to leave it, and the
  // next person on this device shouldn't land on it.
  const logOutNow = useMutation({
    mutationFn: logOut,
    onSuccess: () => {
      loadPage("/login");
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
