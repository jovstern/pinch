// Where i18next puts the user's text, so the sentence can be cut there: a character that no
// translation, title or search holds.
const mark = "\u0000";

type InSentenceProps = {
  // The translated sentence, given a stand-in for the text:
  // (title) => t("recipe.willBeDeleted", { title }).
  sentence: (text: string) => string;
  text: string;
};

// A translated sentence around text a user wrote (a recipe's title, a search), the text in its own
// <bdi>, so a Hebrew title in an English sentence, or the reverse, leaves the sentence's
// punctuation where it belongs (design §16.5). Cut by hand, not by react-i18next's Trans: its
// parser cost the entry 4.2 kB gzip. One span, so in a flex box (a Button) the sentence is one
// item, not three spaced by its gap.
export function InSentence({ sentence, text }: InSentenceProps) {
  const [before, after] = sentence(mark).split(mark);
  return (
    <span>
      {before}
      <bdi>{text}</bdi>
      {after}
    </span>
  );
}
