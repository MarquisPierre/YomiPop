import { AiUnavailableError, askGemini } from "./gemini.js";

// Describes a photo the user can pick for a card.
export interface FoundImage {
  url: string;
  width: number;
  height: number;
  // Holds the credit line Pexels asks for.
  attribution: string;
}

// Describes the parts of a Pexels photo this uses.
interface PexelsPhoto {
  width: number;
  height: number;
  photographer: string;
  src: { medium: string };
}

// Asks Gemini for a short English search that would find a clear photo of the word.
// Falls back to the dictionary meaning if the AI can't help.
async function searchWords(word: string, meaning: string): Promise<string> {
  try {
    const { query } = await askGemini<{ query: string }>(
      `Give a short English image search (1 to 3 words) that would find a clear photo showing "${meaning}", the Japanese word ${word}. Prefer concrete, visible things.`,
      {
        type: "OBJECT",
        properties: { query: { type: "STRING" } },
        required: ["query"],
      },
    );
    return query || meaning;
  } catch {
    return meaning;
  }
}

// Finds up to 8 photos for the word on Pexels, searched by the English meaning as the build plan says.
export async function findImages(
  word: string,
  meaning: string,
): Promise<FoundImage[]> {
  // Reads the key when used, so tests can supply a fake one.
  const { PEXELS_API_KEY } = process.env;
  if (!PEXELS_API_KEY) throw new AiUnavailableError("PEXELS_API_KEY isn't set");

  const query = await searchWords(word, meaning);
  const response = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=8`,
    {
      headers: { Authorization: PEXELS_API_KEY },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new AiUnavailableError(`Pexels answered ${response.status}`);
  }

  const { photos } = (await response.json()) as { photos: PexelsPhoto[] };
  // Uses Pexels' medium size, which keeps cards quick to load.
  return photos.map((photo) => ({
    url: photo.src.medium,
    width: photo.width,
    height: photo.height,
    attribution: `Photo by ${photo.photographer} on Pexels`,
  }));
}
