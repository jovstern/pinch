const FRACTION = "[⅛¼⅓½⅔¾⅕⅙⅜⅝⅞]";
// A number as it's shown: "8", "4½" or "½".
const SHOWN = `(?:\\d+${FRACTION}?|${FRACTION})`;
// A range of them ("8–10", "3-4½", "½-1"), or one number with a fraction ("2¼").
const RANGE_OR_FRACTION = new RegExp(`(${SHOWN})([-–])(${SHOWN})|\\d*${FRACTION}`, "g");

// A range of numbers as it's shown ("8–10 minutes", "4–6 eggs", "15-30 דקות"): kept on one line,
// with a word joiner on each side of its dash, so a narrow screen never leaves "8–" at a line's
// end; and set left to right, in an isolate, so in a Hebrew line it isn't flipped to "10–8". A
// number with a fraction ("2¼", design D48) is isolated too: the fraction is a neutral character,
// so a Hebrew line would put it first ("¼2"). Screen readers skip the marks; a copy of the text
// keeps them. A range with spaces ("8 – 10") is left as it is. Only for showing: timers read the
// step as written.
export function keepRangesTogether(text: string) {
  return text.replace(
    RANGE_OR_FRACTION,
    (match: string, low?: string, dash?: string, high?: string) =>
      dash ? `⁦${low ?? ""}⁠${dash}⁠${high ?? ""}⁩` : `⁦${match}⁩`,
  );
}
