import { lazy, Suspense, useState } from "react";
import { InfoButton } from "./InfoButton.tsx";
import type { InfoPopoverProps } from "./InfoPopover.tsx";

// The popover is its own chunk, fetched when the (i) is about to be pressed (a pointer over it, a
// finger on it, focus) or is pressed, as the avatar's menu (LazyUserMenu): Radix's positioning
// would put / over its JS budget. Until then an (i) that looks and reads the same stands in;
// pressed, the popover takes its place, open.
const loadInfo = () => import("./InfoPopover.tsx");
function preloadInfo() {
  loadInfo().catch(() => undefined);
}
const InfoPopover = lazy(async () => ({ default: (await loadInfo()).InfoPopover }));

export function LazyInfoPopover(props: InfoPopoverProps) {
  const [pressed, setPressed] = useState(false);
  const standIn = (
    <InfoButton
      label={props.label}
      aria-expanded={false}
      onPointerEnter={preloadInfo}
      onFocus={preloadInfo}
      onClick={() => {
        setPressed(true);
      }}
    />
  );
  if (!pressed) return standIn;
  return (
    <Suspense fallback={standIn}>
      <InfoPopover {...props} />
    </Suspense>
  );
}
