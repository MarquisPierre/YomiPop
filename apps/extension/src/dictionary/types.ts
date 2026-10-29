// Describes one word in the dictionary.
export interface DictionaryEntry {
  id: string;
  kanji: string[];
  readings: string[];
  senses: Sense[];
}

// Describes one group of related meanings.
export interface Sense {
  partsOfSpeech: string[];
  meanings: string[];
}
