// The step whose card a swipe came to rest on: the card that snaps nearest to how far the row is
// scrolled. A card snaps at its left edge, or, when the row can't scroll that far (the last
// card), at the row's end. An LTR row (scrollLeft grows to the right): the page is LTR even for
// a Hebrew recipe.
export function nearestStep(scrollLeft: number, cardStarts: number[], scrollEnd: number) {
  const distances = cardStarts.map((start) => Math.abs(Math.min(start, scrollEnd) - scrollLeft));
  return distances.indexOf(Math.min(...distances));
}
