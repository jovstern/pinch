import { afterEach, expect, test, vi } from "vitest";

// The module reads the stored choice as it loads, so each test loads it afresh, after setting up
// the device: its storage and its system's theme (jsdom has no matchMedia).
async function loadTheme() {
  vi.resetModules();
  return import("./theme.ts");
}

// A system whose theme the test can change, telling the page as a browser does.
function system(dark: boolean) {
  const listeners: (() => void)[] = [];
  const media = {
    matches: dark,
    addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal("matchMedia", () => media);
  return {
    turn(toDark: boolean) {
      media.matches = toDark;
      for (const listener of listeners) listener();
    },
  };
}

const pageTheme = () => document.documentElement.dataset.theme;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

test("a choice stored on this device beats the system's theme", async () => {
  system(true);
  localStorage.setItem("pinch_theme", "light");
  const { applyTheme, getTheme } = await loadTheme();
  applyTheme();
  expect(getTheme()).toBe("light");
  expect(pageTheme()).toBe("light");
});

test("with no choice stored, the theme is the system's", async () => {
  system(true);
  const { applyTheme, getTheme } = await loadTheme();
  applyTheme();
  expect(getTheme()).toBe("system");
  expect(pageTheme()).toBe("dark");
});

test("on System, the page follows the system as it changes", async () => {
  const device = system(false);
  const { watchTheme } = await loadTheme();
  watchTheme();
  device.turn(true);
  expect(pageTheme()).toBe("dark");
  device.turn(false);
  expect(pageTheme()).toBe("light");
});

test("on Dark, a change to the system leaves the page dark", async () => {
  const device = system(false);
  localStorage.setItem("pinch_theme", "dark");
  const { watchTheme } = await loadTheme();
  watchTheme();
  device.turn(true);
  device.turn(false);
  expect(pageTheme()).toBe("dark");
});

test("a choice applies at once and is saved; System clears it", async () => {
  system(false);
  const { setTheme } = await loadTheme();
  setTheme("dark");
  expect(pageTheme()).toBe("dark");
  expect(localStorage.getItem("pinch_theme")).toBe("dark");
  setTheme("system");
  expect(pageTheme()).toBe("light");
  expect(localStorage.getItem("pinch_theme")).toBeNull();
});

test("without storage (a private window that blocks it), a choice still applies to the page", async () => {
  system(false);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("blocked", "SecurityError");
  });
  const { getTheme, setTheme } = await loadTheme();
  setTheme("dark");
  expect(getTheme()).toBe("dark");
  expect(pageTheme()).toBe("dark");
});

test("a choice made in another tab applies here too", async () => {
  system(false);
  const { getTheme, watchTheme } = await loadTheme();
  watchTheme();
  localStorage.setItem("pinch_theme", "dark");
  dispatchEvent(new StorageEvent("storage", { key: "pinch_theme", newValue: "dark" }));
  expect(getTheme()).toBe("dark");
  expect(pageTheme()).toBe("dark");
});
