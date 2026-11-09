import { useEffect, useState } from "react";

// "on" while the screen is kept on; "off" if the browser refused (low battery, say) or has no
// Wake Lock API, so the page can say so rather than let the screen lock mid-recipe; "asking"
// until the browser answers.
export type WakeLockState = "asking" | "on" | "off";

// Keeps the screen on while cook mode is open (docs/ux/plan.md U2). The browser lets go of the
// lock whenever the tab is hidden, so it's asked for again each time the tab comes back.
export function useWakeLock(): WakeLockState {
  const [state, setState] = useState<WakeLockState>(() =>
    "wakeLock" in navigator ? "asking" : "off",
  );

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
        // Two requests can overlap (the tab hidden and shown again meanwhile): keep the newest.
        void lock?.release();
        lock = next;
        setState("on");
        next.addEventListener("release", () => {
          if (lock === next) setState("off");
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
