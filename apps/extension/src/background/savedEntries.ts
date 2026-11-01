import { WEB_URL } from "../config";
import { getSessionToken } from "../session";

// Sets how long the saved list is trusted before it's fetched again.
const REFRESH_AFTER = 5 * 60 * 1000;

// Names the storage slot for the list. Session storage outlives the background
// script, which Chrome stops when idle, and is cleared when the browser closes.
const STORAGE_KEY = "savedEntries";

// Describes the logged-in user's saved entry IDs, and whose they are.
interface SavedList {
  token: string;
  ids: string[];
  fetchedAt: number;
}

let fetching: Promise<void> | null = null;

// Reads the stored list, if any.
async function loadList(): Promise<SavedList | null> {
  const stored = await chrome.storage.session.get(STORAGE_KEY);
  return (stored[STORAGE_KEY] as SavedList | undefined) ?? null;
}

// Fetches the saved entry IDs from the API, keeping the old list if it fails.
async function refresh(token: string): Promise<void> {
  try {
    const response = await fetch(`${WEB_URL}/api/cards/saved-entries`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.status === 401) await forgetSavedEntries();
    if (!response.ok) return;
    const ids: string[] = await response.json();
    const list: SavedList = { token, ids, fetchedAt: Date.now() };
    await chrome.storage.session.set({ [STORAGE_KEY]: list });
  } catch {
    // The API is unreachable, so the badges wait for the next try.
  } finally {
    fetching = null;
  }
}

// Returns the saved entry IDs right away, fetching a fresh list in the background when needed.
// The first lookup after logging in has no badges, so lookups never wait on the API.
export async function getSavedEntries(): Promise<Set<string>> {
  const token = await getSessionToken();
  if (!token) {
    await forgetSavedEntries();
    return new Set();
  }

  const stored = await loadList();
  const ours = stored?.token === token ? stored : null;
  if (!ours || Date.now() - ours.fetchedAt > REFRESH_AFTER) {
    fetching ??= refresh(token);
  }
  return new Set(ours?.ids);
}

// Adds an entry to the list after it's saved.
export async function markSaved(entryId: string): Promise<void> {
  const list = await loadList();
  if (!list || list.ids.includes(entryId)) return;
  list.ids.push(entryId);
  await chrome.storage.session.set({ [STORAGE_KEY]: list });
}

// Forgets the list, e.g. after the API says the user is logged out.
export async function forgetSavedEntries(): Promise<void> {
  await chrome.storage.session.remove(STORAGE_KEY);
}
