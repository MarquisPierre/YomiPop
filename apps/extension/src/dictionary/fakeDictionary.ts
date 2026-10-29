// Provides a temporary word list until the real JMdict lookup is in.

// Describes the shape of a single dictionary entry.
export interface DictionaryEntry {
  word: string;
  reading: string;
  meanings: string[];
}

// Lists sample words to test with.
const entries: DictionaryEntry[] = [
  { word: "日本", reading: "にほん", meanings: ["Japan"] },
  { word: "日本語", reading: "にほんご", meanings: ["Japanese (language)"] },
  { word: "日", reading: "ひ", meanings: ["day", "sun"] },
  { word: "本", reading: "ほん", meanings: ["book"] },
  { word: "勉強", reading: "べんきょう", meanings: ["study"] },
  { word: "食べる", reading: "たべる", meanings: ["to eat"] },
];

// Looks up an entry by its word.
const dictionary = new Map(entries.map((entry) => [entry.word, entry]));

// Limits how long a matched word can be.
const MAX_WORD_LENGTH = 10;

// Returns the longest word found at the start of the text, or undefined.
export function findWord(text: string): DictionaryEntry | undefined {
  const maxLength = Math.min(text.length, MAX_WORD_LENGTH);

  for (let length = maxLength; length > 0; length--) {
    const candidate = text.slice(0, length);
    const entry = dictionary.get(candidate);
    if (entry) return entry;
  }

  return undefined;
}
