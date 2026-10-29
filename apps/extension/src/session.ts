import { API_URL } from "./config";

// Lists the names Better Auth gives the login cookie. Sites on https use the second one.
const COOKIE_NAMES = [
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
    const cookie = await chrome.cookies.get({ url: API_URL, name });
    if (cookie) return decodeURIComponent(cookie.value);
  }
  return null;
}

// Asks the API who's logged in, or returns null if nobody is.
export async function getSignedInUser(): Promise<SignedInUser | null> {
  const token = await getSessionToken();
  if (!token) return null;

  try {
    const response = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const session: { user: SignedInUser } | null = await response.json();
    return session?.user ?? null;
  } catch {
    return null;
  }
}
