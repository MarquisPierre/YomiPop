// Points at the card routes. The web app forwards /api to the API (see next.config.ts).
const CARDS_URL = "/api/cards";

// Describes a card as the API sends it.
export interface Card {
  id: string;
  word: string;
  reading: string;
  meanings: string[];
  sentence: string | null;
  translation: string | null;
  deckId: string;
  dueAt: string;
  // Counts how many times the card has been answered.
  reps: number;
  // Holds the card's picture and its credit line, or null when it has none.
  // Uploads have no credit line, so their attribution is null.
  image: { url: string; attribution: string | null } | null;
}

// Lists the answers: 1 = Again, 2 = Hard, 3 = Good, 4 = Easy.
export type Rating = 1 | 2 | 3 | 4;

// Means the API says nobody is logged in.
export class NotLoggedInError extends Error {}

// Throws the right error if the API turned the request down.
function checkResponse(response: Response): void {
  if (response.status === 401) throw new NotLoggedInError();
  if (!response.ok) throw new Error(`API returned ${response.status}`);
}

// Describes the parts of a card the user can edit.
export type CardChanges = Partial<
  Pick<
    Card,
    "word" | "reading" | "meanings" | "sentence" | "translation" | "deckId"
  >
> & {
  // Removes the card's picture. Null is the only value allowed.
  imageId?: null;
  image?: ChosenImage;
};

// Describes an AI-made example sentence, as the API sends it.
export interface ExampleSentence {
  japanese: string;
  reading: string;
  english: string;
}

// Gets AI example sentences for a card's word. Fresh asks for new ones instead of saved ones.
export async function getAiSentences(
  card: Card,
  fresh: boolean,
): Promise<ExampleSentence[]> {
  const response = await fetch("/api/ai/sentences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: card.word,
      reading: card.reading,
      meaning: card.meanings.slice(0, 2).join("; ").slice(0, 200),
      fresh,
    }),
  });
  await checkResponseWithReason(response);
  return (await response.json()).sentences;
}

// Describes a picture chosen for a card: an Unsplash photo with its credit, or the user's own upload.
export interface ChosenImage {
  url: string;
  width?: number;
  height?: number;
  attribution?: string;
  downloadLocation?: string;
}

// Describes a picture found for a card, as the API sends it.
export interface FoundImage {
  url: string;
  width: number;
  height: number;
  attribution: string;
  downloadLocation: string;
}

// Finds pictures for a card's word. Fresh asks for new ones instead of saved ones.
export async function findImages(
  card: Card,
  fresh: boolean,
): Promise<FoundImage[]> {
  const response = await fetch("/api/ai/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      word: card.word,
      reading: card.reading,
      // Uses the first two meanings, which is enough for a good search and stays within the limit.
      meaning: card.meanings.slice(0, 2).join("; ").slice(0, 200),
      fresh,
    }),
  });
  await checkResponseWithReason(response);
  return (await response.json()).images;
}

// Fetches all of the user's cards, newest first.
export async function getCards(): Promise<Card[]> {
  const response = await fetch(CARDS_URL);
  checkResponse(response);
  return response.json();
}

// Saves changes to a card and returns the updated card.
export async function updateCard(
  id: string,
  changes: CardChanges,
): Promise<Card> {
  const response = await fetch(`${CARDS_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  checkResponse(response);
  return response.json();
}

// Deletes a card.
export async function deleteCard(id: string): Promise<void> {
  const response = await fetch(`${CARDS_URL}/${id}`, { method: "DELETE" });
  checkResponse(response);
}

// Builds the time zone part of a request, plus the deck when reviewing just one,
// so the API counts days the way the user sees them.
function reviewQuery(deckId?: string): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const deck = deckId ? `&deckId=${encodeURIComponent(deckId)}` : "";
  return `timeZone=${encodeURIComponent(timeZone)}${deck}`;
}

// Fetches the cards to review now, with new cards held to today's limit.
export async function getDueCards(deckId?: string): Promise<Card[]> {
  const response = await fetch(`${CARDS_URL}/due?${reviewQuery(deckId)}`);
  checkResponse(response);
  return response.json();
}

// Describes the numbers shown above the review.
export interface ReviewStats {
  dueNow: number;
  laterToday: number;
  reviewedToday: number;
  streak: number;
}

// Fetches the review stats, counting days in the browser's time zone.
export async function getStats(deckId?: string): Promise<ReviewStats> {
  const response = await fetch(`${CARDS_URL}/stats?${reviewQuery(deckId)}`);
  checkResponse(response);
  return response.json();
}

// Takes back the last answer for a card and returns the card as it was before.
export async function undoReview(id: string): Promise<Card> {
  const response = await fetch(`${CARDS_URL}/${id}/undo`, { method: "POST" });
  checkResponse(response);
  return response.json();
}

// Sends an answer for a card.
export async function reviewCard(id: string, rating: Rating): Promise<void> {
  const response = await fetch(`${CARDS_URL}/${id}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
  checkResponse(response);
}

// Points at the settings routes.
const SETTINGS_URL = "/api/settings";

// Describes the settings a user can change.
export interface Settings {
  newCardsPerDay: number;
}

// Fetches the user's settings.
export async function getSettings(): Promise<Settings> {
  const response = await fetch(SETTINGS_URL);
  checkResponse(response);
  return response.json();
}

// Saves the user's settings and returns them as stored.
export async function updateSettings(settings: Settings): Promise<Settings> {
  const response = await fetch(SETTINGS_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  checkResponse(response);
  return response.json();
}

// Means the API turned a request down, with its reason.
export class ApiError extends Error {}

// Throws the API's own reason when it turned the request down.
async function checkResponseWithReason(response: Response): Promise<void> {
  if (response.status === 401) throw new NotLoggedInError();
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.message ?? `API returned ${response.status}`);
  }
}

// Points at the deck routes.
const DECKS_URL = "/api/decks";

// Describes a deck with how many cards are due and new in it.
export interface Deck {
  id: string;
  name: string;
  due: number;
  new: number;
}

// Fetches the user's decks, oldest first.
export async function getDecks(): Promise<Deck[]> {
  const response = await fetch(`${DECKS_URL}?${reviewQuery()}`);
  await checkResponseWithReason(response);
  return response.json();
}

// Makes a new deck.
export async function createDeck(name: string): Promise<void> {
  const response = await fetch(DECKS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  await checkResponseWithReason(response);
}

// Renames a deck.
export async function renameDeck(id: string, name: string): Promise<void> {
  const response = await fetch(`${DECKS_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  await checkResponseWithReason(response);
}

// Deletes a deck and its cards.
export async function deleteDeck(id: string): Promise<void> {
  const response = await fetch(`${DECKS_URL}/${id}`, { method: "DELETE" });
  await checkResponseWithReason(response);
}

// Lists the picture types the build plan allows.
const PICTURE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Shrinks a picture in the browser to WebP, as the build plan's "resize to one size" rule asks:
// a centred square for profile pictures, or a set width for cards.
async function shrinkToWebp(
  file: File,
  size: number,
  square: boolean,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  // Crops the middle square for a profile picture; keeps the whole picture for a card.
  const side = Math.min(bitmap.width, bitmap.height);
  const crop = square
    ? {
        x: (bitmap.width - side) / 2,
        y: (bitmap.height - side) / 2,
        w: side,
        h: side,
      }
    : { x: 0, y: 0, w: bitmap.width, h: bitmap.height };
  // Never makes a small picture bigger.
  const width = Math.min(size, crop.w);
  const height = Math.round((crop.h / crop.w) * width);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, crop.x, crop.y, crop.w, crop.h, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((done) =>
    canvas.toBlob(done, "image/webp", 0.85),
  );
  if (!blob) throw new ApiError("Couldn't read that picture.");
  return { blob, width, height };
}

// Uploads a picture from the user's device: shrinks it, asks the API for a one-time link,
// sends it straight to storage, and returns its public link.
export async function uploadPicture(
  file: File,
  kind: "avatar" | "card",
): Promise<ChosenImage> {
  if (!PICTURE_TYPES.includes(file.type)) {
    throw new ApiError("Pick a JPG, PNG or WebP picture.");
  }
  const { blob, width, height } = await shrinkToWebp(
    file,
    kind === "avatar" ? 256 : 512,
    kind === "avatar",
  );

  const response = await fetch("/api/media/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  });
  await checkResponseWithReason(response);
  const { uploadUrl, publicUrl } = await response.json();

  const upload = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/webp" },
    body: blob,
  });
  if (!upload.ok) throw new ApiError("Couldn't upload the picture.");
  return { url: publicUrl, width, height };
}
