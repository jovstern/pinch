import { lazy, Suspense, useState } from "react";
import { PasteHelpButton } from "./PasteHelpButton.tsx";

// The popover is its own chunk, fetched when the (i) is about to be pressed (a pointer over it, a
// finger on it, focus) or is pressed, as the avatar's menu (LazyUserMenu): Radix's positioning
// would put / over its JS budget. Until then an (i) that looks and reads the same stands in;
// pressed, the popover takes its place, open.
const loadHelp = () => import("./PasteHelp.tsx");
function preloadHelp() {
  loadHelp().catch(() => undefined);
}
const PasteHelp = lazy(async () => ({ default: (await loadHelp()).PasteHelp }));

export function LazyPasteHelp() {
  const [pressed, setPressed] = useState(false);
  const standIn = (
    <PasteHelpButton
      aria-expanded={false}
      onPointerEnter={preloadHelp}
      onFocus={preloadHelp}
      onClick={() => {
        setPressed(true);
      }}
    />
  );
  if (!pressed) return standIn;
  return (
    <Suspense fallback={standIn}>
      <PasteHelp />
    </Suspense>
  );
}
