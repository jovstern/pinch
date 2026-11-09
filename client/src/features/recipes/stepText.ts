// A step as it's shown: a range of numbers ("8–10 minutes", "15-30 דקות") kept on one line,
// with a word joiner on each side of its dash, so a narrow screen never leaves "8–" at a line's
// end (an en dash may break there; a hyphen before a digit already can't, but one rule reads
// simpler). Screen readers skip the joiner; a copy of the text keeps it. A range with spaces
// ("8 – 10") isn't joined. Only for showing: timers read the step as written.
export function stepText(step: string) {
  return step.replace(/(\d)([-–])(\d)/g, "$1\u2060$2\u2060$3");
}
