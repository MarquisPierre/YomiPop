// Finds where the word appears in the sentence. Words are saved in dictionary form
// but often appear conjugated, like 見る in 見ました, so shorter starts are tried too.
function findWord(sentence: string, word: string): [number, number] | null {
  for (let length = word.length; length > 0; length--) {
    const index = sentence.indexOf(word.slice(0, length));
    if (index !== -1) return [index, length];
  }
  return null;
}

// Shows the sentence the card was saved from, with the word in bold, and its translation if wanted.
export function Sentence({
  sentence,
  word,
  translation,
}: {
  sentence: string;
  word: string;
  translation: string | null;
}) {
  const found = findWord(sentence, word);

  return (
    <div>
      <p lang="ja" className="text-lg">
        {found ? (
          <>
            {sentence.slice(0, found[0])}
            <strong>{sentence.slice(found[0], found[0] + found[1])}</strong>
            {sentence.slice(found[0] + found[1])}
          </>
        ) : (
          sentence
        )}
      </p>
      {translation && <p className="text-sm text-zinc-500">{translation}</p>}
    </div>
  );
}
