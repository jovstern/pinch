import { useSearchParams } from "react-router";

// The multipliers offered for a recipe that doesn't say how many it serves.
export const TIMES = [0.5, 1, 2, 3];

// The amounts for more or fewer people (design D48): the recipe's page and cook mode show them
// scaled, nothing is saved. Kept in the address ("?serves=4", or "?times=2" for a recipe without
// servings), so Cook and the way back keep the choice; a reload too. Anything else, or the
// recipe's own number, reads as the recipe as written.
export function useScale(servings: number | undefined) {
  const [params, setParams] = useSearchParams();
  const serves = Number(params.get("serves"));
  const times = Number(params.get("times"));

  let factor = 1;
  let chosen: number | undefined;
  if (servings && Number.isInteger(serves) && serves >= 1 && serves <= 100) {
    factor = serves / servings;
    chosen = serves;
  } else if (!servings && TIMES.includes(times)) {
    factor = times;
    chosen = times;
  }
  // The query string to carry to Cook and back, "" for the recipe as written.
  const search = factor === 1 ? "" : `?${servings ? "serves" : "times"}=${String(chosen)}`;

  // Replaces the entry: Back leaves the page, rather than stepping through each choice.
  function choose(value: number) {
    const atOne = servings ? value === servings : value === 1;
    setParams(atOne ? {} : { [servings ? "serves" : "times"]: String(value) }, { replace: true });
  }

  return { factor, chosen, search, choose };
}

// "×½", "×2": the half as the fraction a cook reads.
export function timesLabel(times: number) {
  return `×${times === 0.5 ? "½" : String(times)}`;
}
