import { API_URL } from "../config";
import type { DictionaryEntry } from "../dictionary/types";
import type { AddCardResult } from "../messages";

// Saves the entry as a flashcard through the API.
export async function addCard(entry: DictionaryEntry): Promise<AddCardResult> {
  const card = {
    word: entry.kanji[0] ?? entry.readings[0] ?? "",
    reading: entry.kanji.length > 0 ? (entry.readings[0] ?? "") : "",
    meanings: entry.senses.map((sense) => sense.meanings.join("; ")),
    entryId: entry.id,
  };

  try {
    const response = await fetch(`${API_URL}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });
    if (response.status === 409) return "exists";
    return response.ok ? "added" : "error";
  } catch {
    return "error";
  }
}
