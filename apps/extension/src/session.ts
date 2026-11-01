import { WEB_URL } from "./config";

// Lists the names Better Auth gives the login cookie. Sites on https use the second one.
export const COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

// Describes the logged-in user.
export interface SignedInUser {
  name: string;
  email: string;
}

// Reads the login cookie the web app left, if there is one.
export async function getSessionToken(): Promise<string | null> {
  for (const name of COOKIE_NAMES) {
    const cookie = await chrome.cookies.get({ url: WEB_URL, name });
    if (cookie) return decodeURIComponent(cookie.value);
  }
  return null;
}

// Ends the session on the API, which logs out the web app too, and removes the cookie.
export async function signOut(): Promise<void> {
  const token = await getSessionToken();
  if (token) {
    await fetch(`${WEB_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: "{}",
    }).catch(() => {});
  }
  for (const name of COOKIE_NAMES) {
    await chrome.cookies.remove({ url: WEB_URL, name });
  }
}

// Describes the review numbers the menu and toolbar icon show.
export interface ReviewStats {
  dueNow: number;
  streak: number;
}

// Asks the API how many cards are due, or returns null if nobody is logged in or it's unreachable.
export async function getReviewStats(): Promise<ReviewStats | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  try {
    const response = await fetch(
      `${WEB_URL}/api/cards/stats?timeZone=${encodeURIComponent(timeZone)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

// Asks the API who's logged in, or returns null if nobody is.
export async function getSignedInUser(): Promise<SignedInUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const response = await fetch(`${WEB_URL}/api/auth/get-session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const session: { user: SignedInUser } | null = await response.json();
    return session?.user ?? null;
  } catch {
    return null;
  }
}
