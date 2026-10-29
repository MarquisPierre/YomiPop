import type { DictionaryEntry } from "../dictionary/types";
import { openDictionary } from "./database";

// Sets the longest word we try to match.
const MAX_WORD_LENGTH = 12;

const database = openDictionary();

// Finds every entry for the longest word at the start of the text.
export async function findWord(text: string): Promise<DictionaryEntry[]> {
  const db = await database;
  for (
    let length = Math.min(text.length, MAX_WORD_LENGTH);
    length > 0;
    length--
  ) {
    const word = text.slice(0, length);
    const entries = [
      ...(await db.getAllFromIndex("entries", "kanji", word)),
      ...(await db.getAllFromIndex("entries", "readings", word)),
    ];
    if (entries.length > 0) return entries;
  }
  return [];
}
