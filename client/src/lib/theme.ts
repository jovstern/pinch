import { useSyncExternalStore } from "react";

// Light, dark or the system's (design §14, "The theme"): chosen in the avatar's menu, saved on this
// device only. index.html's script sets <html data-theme> before the first paint, from the same
// key; from then on this module keeps it: on a choice, when the system changes while the choice is
// System, and when another tab chooses. The CSS keys on data-theme alone (globals.css).
export type Theme = "system" | "light" | "dark";

const key = "pinch_theme";
const systemDark = "(prefers-color-scheme: dark)";
// The browser's bar in the page's colour (--color-surface of each theme), as index.html's script.
const barColour = { light: "#fbf8f2", dark: "#17130f" };

// Unreadable or unwritable storage (a private window that blocks it) isn't an error: the choice
// still holds for this page, it just isn't kept.
function stored(): Theme {
  try {
    const value = localStorage.getItem(key);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

let chosen = stored();
const listeners = new Set<() => void>();

export function resolveTheme(theme: Theme, systemIsDark: boolean) {
  if (theme === "system") return systemIsDark ? "dark" : "light";
  return theme;
}

export function applyTheme() {
  const theme = resolveTheme(chosen, chosen === "system" && matchMedia(systemDark).matches);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", barColour[theme]);
  for (const listener of listeners) listener();
}

export function getTheme() {
  return chosen;
}

export function setTheme(theme: Theme) {
  chosen = theme;
  try {
    // System is the default, so it's the key's absence.
    if (theme === "system") localStorage.removeItem(key);
    else localStorage.setItem(key, theme);
  } catch {
    // Kept for this page only (above).
  }
  applyTheme();
}

// main.tsx, once: follow the system while on System, and another tab's choice.
export function watchTheme() {
  matchMedia(systemDark).addEventListener("change", applyTheme);
  addEventListener("storage", (event) => {
    if (event.key !== key && event.key !== null) return;
    chosen = stored();
    applyTheme();
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// The choice, for the menu's radio group.
export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme);
}

// Whether the page is dark now, for what CSS can't switch (the logo's file).
export function useDarkTheme() {
  return useSyncExternalStore(subscribe, () => document.documentElement.dataset.theme === "dark");
}
