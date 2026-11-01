import { WEB_URL } from "../config";
import type { DictionaryEntry } from "../dictionary/types";
import type { AddCardResult, ExampleSentence, FoundImage } from "../messages";
import { getSessionToken } from "../session";
import { getSettings } from "../settings";
import { forgetSavedEntries, markSaved } from "./savedEntries";

// Saves the entry, its sentence and translation as a flashcard through the API, as the logged-in user.
export async function addCard(
  entry: DictionaryEntry,
  sentence: string,
  translation: string | null,
  aiSentence?: ExampleSentence,
  image?: FoundImage,
): Promise<AddCardResult> {
  const token = await getSessionToken();
  if (!token) return "loggedOut";

  const { deckId } = await getSettings();
  const card = {
    word: entry.kanji[0] ?? entry.readings[0] ?? "",
    reading: entry.kanji.length > 0 ? (entry.readings[0] ?? "") : "",
    meanings: entry.senses.map((sense) => sense.meanings.join("; ")),
    entryId: entry.id,
    // Uses the AI sentence and its English when chosen, otherwise the page sentence.
    sentence: (aiSentence?.japanese ?? sentence).slice(0, 300) || null,
    translation: (aiSentence?.english ?? translation)?.slice(0, 500) || null,
    // Sends the deck chosen in the menu, or none for the Default deck.
    ...(deckId ? { deckId } : {}),
    // Sends the chosen picture, with Unsplash's "picked" address.
    ...(image ? { image } : {}),
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
    // Spots a deck that was deleted on the website since it was chosen.
    if (response.status === 400) {
      const body = await response.json().catch(() => null);
      if (body?.message === "Unknown deck") return "noDeck";
    }
    return response.ok ? "added" : "error";
  } catch {
    return "error";
  }
}
