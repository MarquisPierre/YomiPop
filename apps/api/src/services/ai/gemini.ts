// Means the AI couldn't answer: it isn't set up, it's down, or it sent something unusable.
export class AiUnavailableError extends Error {}

// Asks Gemini a question and returns its answer as JSON shaped like the schema.
// The key stays on the server, as the build plan requires.
export async function askGemini<T>(prompt: string, schema: object): Promise<T> {
  // Reads the settings when used, so tests can supply fake ones.
  const { GEMINI_API_KEY, GEMINI_MODEL = "gemini-flash-lite-latest" } =
    process.env;
  if (!GEMINI_API_KEY) throw new AiUnavailableError("GEMINI_API_KEY isn't set");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Makes Gemini answer in JSON that matches the schema, so it can be read reliably.
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
      // Gives up rather than leaving the pop-up waiting.
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!response.ok) {
    throw new AiUnavailableError(`Gemini answered ${response.status}`);
  }

  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") {
    throw new AiUnavailableError("Gemini sent no answer");
  }
  return JSON.parse(text) as T;
}
