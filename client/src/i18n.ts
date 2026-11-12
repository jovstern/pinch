import type { Language, Me } from "@pinch/shared";
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en.ts";

// The interface's language (design §16, D39–D41). index.html's script has already chosen it,
// before the first paint (the pinch_lang cookie, else the browser), and set <html lang dir>:
// from then on <html lang> is the language, never the cookie.
export function pageLanguage(): Language {
  return document.documentElement.lang === "he" ? "he" : "en";
}

// t()'s keys are en's, so a key that isn't there fails tsc (§16.3).
declare module "i18next" {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}

// What he.ts must be: en's keys, each a string, and beside a plural an optional _two, Hebrew's
// dual ("שעתיים"). A missing or an extra key fails tsc.
export type Translation<T> = {
  [K in keyof T]: T[K] extends string ? string : Translation<T[K]>;
} & { [K in keyof T as K extends `${infer Key}_other` ? `${Key}_two` : never]?: string };

// English is in the bundle, the fallback for any key. Synchronous (initAsync: false), so t()
// works as soon as this returns. React escapes what it draws, so i18next doesn't.
export function startI18n(language: Language) {
  void i18next.use(initReactI18next).init({
    lng: language,
    fallbackLng: "en",
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
    initAsync: false,
  });
}

// Hebrew is its own chunk, fetched only by a page in Hebrew, before its first render (main.tsx).
export async function loadHebrew() {
  const { he } = await import("./locales/he.ts");
  i18next.addResourceBundle("he", "translation", he);
}

// The language this device keeps (§8.3): the API sets the cookie from the account; signed out, the
// switch on Log in and Sign up sets it here. As the API's: a year, readable by index.html's script.
const cookie = /(?:^|; )pinch_lang=(en|he)/;

export function saveLanguageOnDevice(language: Language) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `pinch_lang=${language}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

// A new device (§16.1): the page started in the cookie's or the browser's language, and me says
// the account's is the other. me's answer has set the cookie, so a reload starts in the account's.
// Only when the cookie now says it: a browser that refuses cookies would reload forever.
export function needsReloadFor(me: Me | null) {
  return (
    me !== null &&
    me.language !== pageLanguage() &&
    cookie.exec(document.cookie)?.[1] === me.language
  );
}
