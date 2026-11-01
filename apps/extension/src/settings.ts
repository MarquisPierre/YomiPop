// Lists the ways the pop-up can open.
export type Trigger = "shift" | "hover";

// Describes the user's saved settings.
export interface Settings {
  trigger: Trigger;
  // Picks the deck new words go to. Null means the account's Default deck.
  deckId: string | null;
  // Remembers that deck's name for the pop-up's footer.
  deckName: string | null;
}

// Sets what a new install starts with.
const DEFAULT_SETTINGS: Settings = {
  trigger: "shift",
  deckId: null,
  deckName: null,
};

// Reads the saved settings, filling in defaults.
export async function getSettings(): Promise<Settings> {
  return (await chrome.storage.sync.get(DEFAULT_SETTINGS)) as Settings;
}

// Saves changes to the settings.
export function saveSettings(changes: Partial<Settings>): Promise<void> {
  return chrome.storage.sync.set(changes);
}

// Runs the callback whenever the settings change.
export function onSettingsChanged(
  callback: (settings: Settings) => void,
): void {
  chrome.storage.onChanged.addListener(async () =>
    callback(await getSettings()),
  );
}
