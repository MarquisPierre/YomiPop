import { AiUnavailableError, askGemini } from "./gemini.js";

// Describes a photo the user can pick for a card.
export interface FoundImage {
  url: string;
  width: number;
  height: number;
  // Holds the credit line Unsplash asks for.
  attribution: string;
  // Holds the address Unsplash asks us to visit when the photo is picked.
  downloadLocation: string;
}

// Describes the parts of an Unsplash photo this uses.
interface UnsplashPhoto {
  width: number;
  height: number;
  urls: { raw: string };
  user: { name: string };
  links: { download_location: string };
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

// Finds up to 8 photos for the word on Unsplash, searched by the English meaning as the build plan says.
export async function findImages(
  word: string,
  meaning: string,
): Promise<FoundImage[]> {
  // Reads the key when used, so tests can supply a fake one.
  const { UNSPLASH_ACCESS_KEY } = process.env;
  if (!UNSPLASH_ACCESS_KEY) {
    throw new AiUnavailableError("UNSPLASH_ACCESS_KEY isn't set");
  }

  const query = await searchWords(word, meaning);
  const response = await fetch(
    `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=8`,
    {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw new AiUnavailableError(`Unsplash answered ${response.status}`);
  }

  const { results } = (await response.json()) as { results: UnsplashPhoto[] };
  return results.map((photo) => ({
    // Asks Unsplash for a 512 px wide WebP copy, the size the build plan recommends.
    url: `${photo.urls.raw}&w=512&fm=webp&q=80`,
    width: photo.width,
    height: photo.height,
    attribution: `Photo by ${photo.user.name} on Unsplash`,
    downloadLocation: photo.links.download_location,
  }));
}

// Tells Unsplash a photo was picked, as its rules ask. A failure here doesn't stop the card saving.
export async function reportImageUse(downloadLocation: string): Promise<void> {
  const { UNSPLASH_ACCESS_KEY } = process.env;
  if (!UNSPLASH_ACCESS_KEY) return;
  await fetch(downloadLocation, {
    headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}
