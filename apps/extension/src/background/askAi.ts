import { WEB_URL } from "../config";
import type {
  AiMessage,
  AiResult,
  ExampleSentence,
  FoundImage,
} from "../messages";
import { getSessionToken } from "../session";

// Asks the API for AI sentences or pictures for a word. The API holds the AI keys,
// as the build plan requires, so the extension never sees them.
export async function askAi(
  message: AiMessage,
): Promise<AiResult<ExampleSentence> | AiResult<FoundImage>> {
  const token = await getSessionToken();
  if (!token) return { ok: false, message: "Log in from the YomiPop menu" };

  const path = message.type === "aiSentences" ? "sentences" : "image";
  try {
    const response = await fetch(`${WEB_URL}/api/ai/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        word: message.word,
        reading: message.reading,
        // Keeps the meaning within the API's limit.
        meaning: message.meaning.slice(0, 200),
        fresh: message.fresh,
      }),
    });
    const body = await response.json().catch(() => null);
    // Shows the API's own reason, like the daily limit, when it says no.
    if (!response.ok) {
      return {
        ok: false,
        message: body?.message ?? "AI isn't available right now",
      };
    }
    const items = message.type === "aiSentences" ? body.sentences : body.images;
    return items.length > 0
      ? { ok: true, items }
      : { ok: false, message: "Nothing found" };
  } catch {
    return { ok: false, message: "Couldn't reach YomiPop" };
  }
}
