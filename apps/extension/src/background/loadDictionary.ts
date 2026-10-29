import type { DictionaryEntry } from "../dictionary/types";
import { openDictionary } from "./database";

// Describes dict/index.json.
interface DictionaryIndex {
  version: string;
  entryCount: number;
  files: string[];
}

// Fetches a file bundled with the extension as JSON.
async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(chrome.runtime.getURL(path));
  if (!response.ok) throw new Error(`Couldn't load ${path}`);
  return (await response.json()) as T;
}

// Loads the bundled dictionary into IndexedDB unless it's already there.
export async function loadDictionary(): Promise<void> {
  const index = await fetchJson<DictionaryIndex>("dict/index.json");
  const db = await openDictionary();

  if ((await db.get("meta", "version")) === index.version) return;

  await db.clear("entries");
  for (const file of index.files) {
    const entries = await fetchJson<DictionaryEntry[]>(`dict/${file}`);
    const tx = db.transaction("entries", "readwrite");
    await Promise.all([
      ...entries.map((entry) => tx.store.put(entry)),
      tx.done,
    ]);
  }

  await db.put("meta", index.version, "version");
  console.log(`Loaded ${index.entryCount} entries`);
}
