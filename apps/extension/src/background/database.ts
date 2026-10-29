import { openDB, type DBSchema } from "idb";
import type { DictionaryEntry } from "../dictionary/types";

// Describes the tables in the dictionary database.
interface DictionarySchema extends DBSchema {
  entries: {
    key: string;
    value: DictionaryEntry;
    indexes: { kanji: string; readings: string };
  };
  meta: {
    key: string;
    value: string;
  };
}

// Opens the database, creating the tables on first run.
export function openDictionary() {
  return openDB<DictionarySchema>("yomipop", 1, {
    upgrade(db) {
      const entries = db.createObjectStore("entries", { keyPath: "id" });
      entries.createIndex("kanji", "kanji", { multiEntry: true });
      entries.createIndex("readings", "readings", { multiEntry: true });
      db.createObjectStore("meta");
    },
  });
}
