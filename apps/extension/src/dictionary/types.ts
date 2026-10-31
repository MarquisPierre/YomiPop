// Describes one word in the dictionary.
export interface DictionaryEntry {
  id: string;
  kanji: string[];
  readings: string[];
  senses: Sense[];
}

// Describes an entry found for the hovered text, and the conjugations undone to reach it.
export interface WordMatch {
  entry: DictionaryEntry;
  reasons: string[];
}

// Describes one group of related meanings.
export interface Sense {
  partsOfSpeech: string[];
  meanings: string[];
}
