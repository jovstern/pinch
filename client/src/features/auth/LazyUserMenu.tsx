import type { Me } from "@pinch/shared";
import { lazy, Suspense, useState } from "react";
import { Avatar } from "./Avatar.tsx";

// The menu is its own chunk, fetched when the avatar is about to be pressed (a pointer over it, a
// finger on it, focus) or is pressed, as ⋯ on a recipe (LazyRecipeMenu, which says why: the
// Radix menu would put every page over its JS budget). Until then an avatar that looks and reads
// the same stands in; pressed, the menu takes its place, open.
const loadMenu = () => import("./UserMenu.tsx");
function preloadMenu() {
  loadMenu().catch(() => undefined);
}
const UserMenu = lazy(async () => ({ default: (await loadMenu()).UserMenu }));

export function LazyUserMenu({ me }: { me: Me }) {
  const [pressed, setPressed] = useState(false);
  const standIn = (
    <Avatar
      me={me}
      aria-expanded={false}
      onPointerEnter={preloadMenu}
      onFocus={preloadMenu}
      onClick={() => {
        setPressed(true);
      }}
    />
  );
  if (!pressed) return standIn;
  return (
    <Suspense fallback={standIn}>
      <UserMenu me={me} />
    </Suspense>
  );
}
