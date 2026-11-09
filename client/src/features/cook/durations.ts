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
  שעה: 3600,
  שעות: 3600,
};

// A number (1.5, or 1,5 as Hebrew writes it), or a range ("6–7", "10 to 12", "10 עד 12"),
// then a unit as a whole word: "20 min", "a 20-minute rest", "10 דקות". Not "1 minced onion":
// the unit must end where the word does. (A shorter unit listed first, as "min" before "mins",
// is fine: when the word goes on, the match tries the longer one.) Not after a digit, "/" or a
// decimal point, so "1 1/2 hours" times nothing rather than 2 hours.
const NUMBER = "\\d+(?:[.,]\\d+)?";
const DURATION = new RegExp(
  `(?:^|[^\\d./,])((${NUMBER})(?:\\s*(?:[-–]|to|עד)\\s*${NUMBER})?\\s*-?\\s*(${Object.keys(UNIT_SECONDS).join("|")}))(?!\\p{L})`,
  "giu",
);

// Times written in words, with no number: "half an hour", "חצי שעה", "שעה" (an hour; "כשעה",
// about an hour, and "לשעה", for an hour, take the prefix the pattern allows).
// Longer phrases first, so "שעה וחצי" (an hour and a half) isn't read as "שעה".
const PHRASE_SECONDS: Record<string, number> = {
  "half an hour": 1800,
  "an hour": 3600,
  "שעה וחצי": 5400,
  "חצי שעה": 1800,
  "רבע שעה": 900,
  שעה: 3600,
};
const PHRASE = new RegExp(
  `(?:^|[^\\p{L}])((?:כ|ל)?(${Object.keys(PHRASE_SECONDS).join("|")}))(?!\\p{L})`,
  "giu",
);

// What joins hours to minutes in one time: "1 hour 20 minutes", "1 hr and 20 min", "שעה ו-20
// דקות" ("and" in Hebrew is a ו joined to the next word).
const JOINER = /^\s*(?:and\s+|,\s*|ו-?)?$/iu;

type Found = Duration & { start: number; end: number };

// The durations in a step, in order. A range's timer is its shorter end: the cook checks then,
// and can start another. Hours then minutes are one timer, not two.
export function stepDurations(step: string): Duration[] {
  const withNumbers = [...step.matchAll(DURATION)].map((match): Found => {
    const [whole, label = "", amount = "", unit = ""] = match;
    // The label is the end of the match (the character before it is only its boundary).
    const start = match.index + whole.length - label.length;
    // Always found: the pattern only matches the table's units.
    const seconds = Number(amount.replace(",", ".")) * (UNIT_SECONDS[unit.toLowerCase()] ?? 0);
    return { label, seconds, start, end: start + label.length };
  });
  const inWords = [...step.matchAll(PHRASE)].map((match): Found => {
    const [whole, label = "", phrase = ""] = match;
    const start = match.index + whole.length - label.length;
    return {
      label,
      seconds: PHRASE_SECONDS[phrase.toLowerCase()] ?? 0,
      start,
      end: start + label.length,
    };
  });
  // A phrase inside a time with a number ("2 שעות" holds no phrase, but be sure) is left out.
  const found = [
    ...withNumbers,
    ...inWords.filter((word) => !withNumbers.some((n) => word.start < n.end && n.start < word.end)),
  ].sort((a, b) => a.start - b.start);
  return joinHoursAndMinutes(step, found).map(({ label, seconds }) => ({ label, seconds }));
}

// "1 hour" then "20 minutes", with only "and" or a space between: one 80-minute timer.
function joinHoursAndMinutes(step: string, found: Found[]): Found[] {
  const joined: Found[] = [];
  for (const next of found) {
    const last = joined.at(-1);
    if (
      last &&
      last.seconds % 3600 === 0 &&
      next.seconds < 3600 &&
      next.seconds % 60 === 0 &&
      JOINER.test(step.slice(last.end, next.start))
    ) {
      joined[joined.length - 1] = {
        label: step.slice(last.start, next.end),
        seconds: last.seconds + next.seconds,
        start: last.start,
        end: next.end,
      };
    } else {
      joined.push(next);
    }
  }
  return joined;
}
