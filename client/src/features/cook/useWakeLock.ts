import { useEffect, useState } from "react";

// "on" while the screen is kept on; "off" if the browser refused (low battery, say) or has no
// Wake Lock API, so the page can say so rather than let the screen lock mid-recipe.
export type WakeLockState = "on" | "off";

// Keeps the screen on while cook mode is open (docs/ux/plan.md U2). The browser lets go of the
// lock whenever the tab is hidden, so it's asked for again each time the tab comes back.
export function useWakeLock(): WakeLockState {
  const [state, setState] = useState<WakeLockState>("off");

  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    let left = false;

    async function request() {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        const next = await navigator.wakeLock.request("screen");
        // The page was left while the request was on its way: let go at once.
        if (left) {
          await next.release();
          return;
        }
        lock = next;
        setState("on");
        next.addEventListener("release", () => {
          setState("off");
        });
      } catch {
        setState("off");
      }
    }

    function onVisibilityChange() {
      void request();
    }

    void request();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      left = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void lock?.release();
    };
  }, []);

  return state;
}
