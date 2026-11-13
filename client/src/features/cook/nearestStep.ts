// Cook mode's row, measured from its start edge so one rule serves both directions (design
// §16.4): the left in English, the right in Hebrew. There, scrollLeft runs from 0 to negative and
// a card's offsetLeft is still from the left, so both are turned into a distance from the start.
type Row = { scrollLeft: number; scrollWidth: number; clientWidth: number };
type Card = { offsetLeft: number; offsetWidth: number };

// How far a card's start edge is from the row's: where the row is scrolled to when it snaps there.
export function cardStart(card: Card, row: Row, rtl: boolean) {
  return rtl ? row.clientWidth - card.offsetLeft - card.offsetWidth : card.offsetLeft;
}

// The step whose card a swipe came to rest on: the card that snaps nearest to how far the row is
// scrolled. A card snaps at its start edge, or, when the row can't scroll that far (the last
// card), at the row's end.
export function nearestStep(row: Row, cards: Card[], rtl: boolean) {
  const scrolled = Math.abs(row.scrollLeft);
  const scrollEnd = row.scrollWidth - row.clientWidth;
  const distances = cards.map((card) =>
    Math.abs(Math.min(cardStart(card, row, rtl), scrollEnd) - scrolled),
  );
  return distances.indexOf(Math.min(...distances));
}
