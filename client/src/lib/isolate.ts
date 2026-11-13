// Text a user wrote (a recipe's title) inside a page's <title>, in Unicode's isolates: FIRST
// STRONG ISOLATE (U+2068) and POP DIRECTIONAL ISOLATE (U+2069), what <bdi> is in the page itself,
// which a <title> can't hold (design §16.3, §16.5). A Hebrew title in "Cooking … · Pinch", or an
// English one in a Hebrew sentence, keeps its own direction, and the sentence's punctuation stays
// where it belongs.
export function isolate(text: string) {
  return `\u2068${text}\u2069`;
}
