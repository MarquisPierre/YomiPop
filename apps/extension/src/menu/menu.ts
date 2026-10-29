import { WEB_URL } from "../config";
import { getSignedInUser, signOut } from "../session";
import { getSettings, saveSettings, type Trigger } from "../settings";

const options = document.querySelectorAll<HTMLInputElement>(
  'input[name="trigger"]',
);
const accountStatus = document.getElementById("account-status")!;
const logInButton = document.getElementById("log-in")!;
const logOutButton = document.getElementById("log-out")!;

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
}

showAccount();
