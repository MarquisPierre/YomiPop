import { getReviewStats, getSessionToken } from "../session";

// Names the alarm that refreshes the due count.
export const BADGE_ALARM = "updateDueBadge";

// Sets how often the due count is refreshed, in minutes.
const REFRESH_MINUTES = 30;

// Shows the number of due cards on the toolbar icon, or nothing when none are due.
export function showDueCount(dueNow: number): void {
  chrome.action.setBadgeText({
    text: dueNow === 0 ? "" : dueNow > 99 ? "99+" : String(dueNow),
  });
  chrome.action.setBadgeBackgroundColor({ color: "#d1242f" });
}

// Fetches the due count and shows it, clearing it when logged out.
// Keeps the old number when the API can't be reached.
export async function updateDueBadge(): Promise<void> {
  if (!(await getSessionToken())) {
    showDueCount(0);
    return;
  }
  const stats = await getReviewStats();
  if (stats) showDueCount(stats.dueNow);
}

// Starts the regular refresh and shows the count right away.
export function startDueBadge(): void {
  chrome.alarms.create(BADGE_ALARM, { periodInMinutes: REFRESH_MINUTES });
  updateDueBadge();
}
