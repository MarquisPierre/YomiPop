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
  dueAt: string;
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
  Pick<Card, "word" | "reading" | "meanings" | "sentence" | "translation">
>;

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

// Builds the time zone part of a request, so the API counts days the way the user sees them.
function timeZoneQuery(): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `timeZone=${encodeURIComponent(timeZone)}`;
}

// Fetches the cards to review now, with new cards held to today's limit.
export async function getDueCards(): Promise<Card[]> {
  const response = await fetch(`${CARDS_URL}/due?${timeZoneQuery()}`);
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
export async function getStats(): Promise<ReviewStats> {
  const response = await fetch(`${CARDS_URL}/stats?${timeZoneQuery()}`);
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
