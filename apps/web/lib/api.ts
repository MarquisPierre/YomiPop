// Points at the YomiPop API.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Describes a card as the API sends it.
export interface Card {
  id: string;
  word: string;
  reading: string;
  meanings: string[];
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

// Fetches the cards that are due now.
export async function getDueCards(): Promise<Card[]> {
  const response = await fetch(`${API_URL}/cards/due`, {
    credentials: "include",
  });
  checkResponse(response);
  return response.json();
}

// Sends an answer for a card.
export async function reviewCard(id: string, rating: Rating): Promise<void> {
  const response = await fetch(`${API_URL}/cards/${id}/review`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rating }),
  });
  checkResponse(response);
}
