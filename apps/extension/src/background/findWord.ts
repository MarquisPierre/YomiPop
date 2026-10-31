import { deinflect, fitsType } from "../dictionary/deinflect";
import type { WordMatch } from "../dictionary/types";
import { openDictionary } from "./database";

// Sets the longest word we try to match.
const MAX_WORD_LENGTH = 12;

const database = openDictionary();

// Finds every entry for the longest word at the start of the text, undoing conjugations.
// Each entry keeps the first, simplest way it was reached.
export async function findWord(text: string): Promise<WordMatch[]> {
  const db = await database;
  for (
    let length = Math.min(text.length, MAX_WORD_LENGTH);
    length > 0;
    length--
  ) {
    const found = new Map<string, WordMatch>();

    for (const { word, type, reasons } of deinflect(text.slice(0, length))) {
      const entries = [
        ...(await db.getAllFromIndex("entries", "kanji", word)),
        ...(await db.getAllFromIndex("entries", "readings", word)),
      ];
      for (const entry of entries) {
        if (fitsType(entry, type) && !found.has(entry.id)) {
          found.set(entry.id, { entry, reasons });
        }
      }
    }

    if (found.size > 0) return [...found.values()];
  }
  return [];
}
