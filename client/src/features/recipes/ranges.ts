// A range of numbers as it's shown ("8–10 minutes", "4–6 eggs", "15-30 דקות"): kept on one line,
// with a word joiner on each side of its dash, so a narrow screen never leaves "8–" at a line's
// end; and set left to right, in an isolate, so in a Hebrew line it isn't flipped to "10–8".
// Screen readers skip both marks; a copy of the text keeps them. A range with spaces
// ("8 – 10") is left as it is. Only for showing: timers read the step as written.
export function keepRangesTogether(text: string) {
  return text.replace(/(\d+)([-–])(\d+)/g, "\u2066$1\u2060$2\u2060$3\u2069");
}
