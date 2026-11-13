import i18next from "i18next";

// A timer's time in the interface's language, from its seconds: "1 hour 30 minutes", "שעה
// ו‑30 דקות". Not the step's own words ("20 min" in a Hebrew page's timer would mix languages);
// the step's text stays as written (D43). Each part's plural is i18next's (Hebrew's dual,
// "שעתיים"); the join's count is the second part's, as Hebrew's ו takes a hyphen before a number.
export function timeInWords(seconds: number) {
  const whole = Math.round(seconds);
  const parts = [
    { count: Math.floor(whole / 3600), key: "cook.hours" },
    { count: Math.floor((whole % 3600) / 60), key: "cook.minutes" },
    { count: whole % 60, key: "cook.seconds" },
  ] as const;
  let words = "";
  for (const { count, key } of parts) {
    if (count === 0) continue;
    const part = i18next.t(key, { count });
    words = words === "" ? part : i18next.t("cook.and", { count, first: words, second: part });
  }
  return words;
}
