import { useSearchParams } from "react-router";

// The multipliers offered for a recipe that doesn't say how many it serves.
export const TIMES = [0.5, 1, 2, 3];

// The people offered for a recipe that serves this many: up to three times it, at least 12, at
// most the 100 a recipe may serve.
export function peopleChoices(servings: number) {
  const most = Math.min(100, Math.max(12, servings * 3));
  return Array.from({ length: most }, (_, index) => index + 1);
}

// The amounts for more or fewer people (design D48): the recipe's page and cook mode show them
// scaled, nothing is saved. Kept in the address ("?serves=4", or "?times=2" for a recipe without
// servings), so Cook and the way back keep the choice; a reload too. Only a choice the picker
// offers counts: anything else reads as the recipe as written.
export function useScale(servings: number | undefined) {
  const [params, setParams] = useSearchParams();
  const serves = Number(params.get("serves"));
  const times = Number(params.get("times"));

  // What's picked: people, or a multiplier; the recipe's own when nothing (valid) is.
  let chosen = servings ?? 1;
  if (servings && peopleChoices(servings).includes(serves)) chosen = serves;
  else if (!servings && TIMES.includes(times)) chosen = times;
  const factor = servings ? chosen / servings : chosen;
  // The query string to carry to Cook and back, "" for the recipe as written.
  const search = factor === 1 ? "" : `?${servings ? "serves" : "times"}=${String(chosen)}`;

  // Replaces the entry: Back leaves the page, rather than stepping through each choice.
  function choose(value: number) {
    const atOne = value === (servings ?? 1);
    setParams(atOne ? {} : { [servings ? "serves" : "times"]: String(value) }, { replace: true });
  }

  return { factor, chosen, search, choose };
}

// "×½", "×2": the half as the fraction a cook reads; left to right in an isolate, as "×" and "½"
// are neutral characters a Hebrew line would flip to "½×".
export function timesLabel(times: number) {
  return `⁦×${times === 0.5 ? "½" : String(times)}⁩`;
}
