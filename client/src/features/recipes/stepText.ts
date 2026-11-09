// A step as it's shown: a range of numbers ("8–10 minutes", "15-30 דקות") kept on one line,
// with a word joiner on each side of its dash, so a narrow screen never leaves "8–" at a line's
// end. Only for showing: timers read the step as written.
export function stepText(step: string) {
  return step.replace(/(\d)([-–])(\d)/g, "$1\u2060$2\u2060$3");
}
