import { pageLanguage } from "../i18n.ts";

// A number the interface shows (minutes, nutrition, the step counter), by Intl in the page's
// language, never by hand (design §16.3): "1,440" in both, with Western digits in Hebrew too. A
// plural's own count is i18next's, which picks its form by it.
export function formatNumber(number: number) {
  return new Intl.NumberFormat(pageLanguage()).format(number);
}
