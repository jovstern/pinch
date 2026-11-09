// A duration a step mentions, as it's written and in seconds, for a timer (docs/ux/plan.md U2).
export type Duration = { label: string; seconds: number };

// Each unit as recipes write it, in English and Hebrew, and its length in seconds.
const UNIT_SECONDS: Record<string, number> = {
  second: 1,
  seconds: 1,
  sec: 1,
  secs: 1,
  minute: 60,
  minutes: 60,
  min: 60,
  mins: 60,
  hour: 3600,
  hours: 3600,
  hr: 3600,
  hrs: 3600,
  שנייה: 1,
  שניה: 1,
  שניות: 1,
  דקה: 60,
  דקות: 60,
  "דק'": 60,
  // The same, with a Hebrew geresh, as a Hebrew keyboard writes it.
  "דק׳": 60,
  שעה: 3600,
  שעות: 3600,
};

// Times written in words, with no number: "half an hour", "חצי שעה", "שעה" (an hour). Longer
// phrases first, so "an hour and a half" isn't read as "an hour".
const PHRASE_SECONDS: Record<string, number> = {
  "an hour and a half": 5400,
  "half an hour": 1800,
  "an hour": 3600,
  "שעה וחצי": 5400,
  "חצי שעה": 1800,
  "רבע שעה": 900,
  שעתיים: 7200,
  שעה: 3600,
};

// One pattern, tried at each place in the step: a time with a number, or one in words.
// - With a number (1.5, or 1,5 as Hebrew writes it) or a range ("6–7", "10 to 12", "10 עד 12"),
//   then a unit: "20 min", "a 20-minute rest", "10 דקות". Not after a digit, "/" or a decimal
//   point, so "1 1/2 hours" times nothing rather than 2 hours.
// - In words, after "and", "in", "about" or "for" joined on in Hebrew: "בחצי שעה", "כשעה",
//   "לשעה". Not inside a word.
// Either ends where its word does: not "1 minced onion". (A shorter word listed first, as "min"
// before "mins", is fine: when the word goes on, the match tries the longer one.) The character
// before a time is matched too, as a boundary, and left out of its label. A guess, not a parse:
// "200 גרם לשעה" (per hour) gets a timer too, and a wrong one costs only a tap.
const NUMBER = "\\d+(?:[.,]\\d+)?";
const UNITS = Object.keys(UNIT_SECONDS).join("|");
const PHRASES = Object.keys(PHRASE_SECONDS).join("|");
const TIME = new RegExp(
  `(^|[^\\d./,])((${NUMBER})(?:\\s*(?:[-–]|to|עד)\\s*${NUMBER})?\\s*-?\\s*(${UNITS}))(?!\\p{L})` +
    `|(^|[^\\p{L}])(ו?[בכל]?(${PHRASES}))(?!\\p{L})`,
  "giu",
);

// What joins hours to minutes in one time: "1 hour 20 minutes", "1 hr and 20 min", "שעה ו-20
// דקות" ("and" in Hebrew is a ו joined to the next word).
const JOINER = /^\s*(?:and\s+|,\s*|ו-?)?$/iu;

type Found = Duration & { start: number; end: number };

// The durations in a step, in order. A range's timer is its shorter end: the cook checks then,
// and can start another. Whole hours then minutes, with only a space, "and", "," or "ו"
// between, are one timer, not two.
export function stepDurations(step: string): Duration[] {
  const found: Found[] = [];
  for (const match of step.matchAll(TIME)) {
    const [
      ,
      before = "",
      withNumber,
      amount = "",
      unit = "",
      beforeWords = "",
      inWords,
      phrase = "",
    ] = match;
    const label = withNumber ?? inWords ?? "";
    const start = match.index + (withNumber ? before : beforeWords).length;
    // Always found: the pattern only matches the tables' words.
    const seconds = withNumber
      ? Number(amount.replace(",", ".")) * (UNIT_SECONDS[unit.toLowerCase()] ?? 0)
      : (PHRASE_SECONDS[phrase.toLowerCase()] ?? 0);
    const time = { label, seconds, start, end: start + label.length };
    const last = found.at(-1);
    if (last && isHoursThenMinutes(last, time) && JOINER.test(step.slice(last.end, time.start))) {
      found[found.length - 1] = {
        label: step.slice(last.start, time.end),
        seconds: last.seconds + time.seconds,
        start: last.start,
        end: time.end,
      };
    } else {
      found.push(time);
    }
  }
  return found.map(({ label, seconds }) => ({ label, seconds }));
}

// Whole hours, then minutes under an hour.
function isHoursThenMinutes(hours: Found, minutes: Found) {
  return hours.seconds % 3600 === 0 && minutes.seconds < 3600 && minutes.seconds % 60 === 0;
}
