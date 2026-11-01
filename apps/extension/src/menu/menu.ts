import { WEB_URL } from "../config";
import { getReviewStats, getSignedInUser, signOut } from "../session";
import { showDueCount } from "../background/dueBadge";
import { getSettings, saveSettings, type Trigger } from "../settings";

const options = document.querySelectorAll<HTMLInputElement>(
  'input[name="trigger"]',
);
const accountStatus = document.getElementById("account-status")!;
const logInButton = document.getElementById("log-in")!;
const logOutButton = document.getElementById("log-out")!;
const reviewStatus = document.getElementById("review-status")!;
const startReviewButton = document.getElementById("start-review")!;

// Saves the choice whenever an option is picked.
for (const option of options) {
  option.addEventListener("change", () =>
    saveSettings({ trigger: option.value as Trigger }),
  );
}

// Ticks the option that matches the saved setting.
getSettings().then((settings) => {
  for (const option of options)
    option.checked = option.value === settings.trigger;
});

// Opens the web app's sign-in page in a new tab.
logInButton.addEventListener("click", () => {
  chrome.tabs.create({ url: `${WEB_URL}/sign-in` });
});

// Opens the review page in a new tab.
startReviewButton.addEventListener("click", () => {
  chrome.tabs.create({ url: `${WEB_URL}/review` });
});

// Logs out everywhere and updates the menu.
logOutButton.addEventListener("click", async () => {
  await signOut();
  showAccount();
});

// Shows who's logged in with a Log out button, or the Log in button if nobody is.
async function showAccount(): Promise<void> {
  const user = await getSignedInUser();
  accountStatus.textContent = user
    ? `Signed in as ${user.name}`
    : "Not logged in";
  logInButton.hidden = Boolean(user);
  logOutButton.hidden = !user;
  reviewStatus.hidden = !user;
  startReviewButton.hidden = true;
  if (user) showReview();
}

// Shows how many cards are due with a Start review button, and updates the toolbar icon to match.
async function showReview(): Promise<void> {
  reviewStatus.textContent = "Checking cards…";
  const stats = await getReviewStats();
  if (!stats) {
    reviewStatus.textContent = "Couldn't check your cards";
    return;
  }

  const streak = stats.streak > 0 ? ` · 🔥 ${stats.streak}-day streak` : "";
  reviewStatus.textContent =
    stats.dueNow > 0
      ? `${stats.dueNow} ${stats.dueNow === 1 ? "card" : "cards"} due${streak}`
      : `All caught up${streak}`;
  startReviewButton.hidden = stats.dueNow === 0;
  showDueCount(stats.dueNow);
}

showAccount();
