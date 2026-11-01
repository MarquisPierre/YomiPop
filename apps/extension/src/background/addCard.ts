import { WEB_URL } from "../config";
import type { DictionaryEntry } from "../dictionary/types";
import type { AddCardResult } from "../messages";
import { getSessionToken } from "../session";
import { forgetSavedEntries, markSaved } from "./savedEntries";

// Saves the entry and its sentence as a flashcard through the API, as the logged-in user.
export async function addCard(
  entry: DictionaryEntry,
  sentence: string,
): Promise<AddCardResult> {
  const token = await getSessionToken();
  if (!token) return "loggedOut";

  const card = {
    word: entry.kanji[0] ?? entry.readings[0] ?? "",
    reading: entry.kanji.length > 0 ? (entry.readings[0] ?? "") : "",
    meanings: entry.senses.map((sense) => sense.meanings.join("; ")),
    entryId: entry.id,
    sentence: sentence.slice(0, 300) || null,
  };

  try {
    const response = await fetch(`${WEB_URL}/api/cards`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(card),
    });
    if (response.status === 401) {
      await forgetSavedEntries();
      return "loggedOut";
    }
    if (response.status === 409 || response.ok) await markSaved(entry.id);
    if (response.status === 409) return "exists";
    return response.ok ? "added" : "error";
  } catch {
    return "error";
  }
}
