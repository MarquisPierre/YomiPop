import type { WordMatch } from "../dictionary/types";
import type { AddCardMessage, AddCardResult, LookupMessage } from "../messages";
import { getSettings, onSettingsChanged, type Trigger } from "../settings";
import { getTextAtPoint } from "./getTextAtPoint";
import { getShownEntries, hidePopup, setPopupStatus, showPopup } from "./popup";
import { translateSentence } from "./translate";

// Sets how long the cursor must rest on a word in hover mode.
const HOVER_DELAY = 150;

// Builds the footer text for each way saving a word can end.
const SAVE_RESULTS: Record<AddCardResult, (word: string) => string> = {
  added: (word) => `Saved ${word} ✓`,
  exists: (word) => `${word} is already saved`,
  loggedOut: () => "Log in from the YomiPop menu",
  error: () => "Couldn't save (is the API running?)",
};

let trigger: Trigger = "shift";
let latestLookup = 0;
let hoverTimer: number | undefined;
let shownSentence = "";

getSettings().then((settings) => (trigger = settings.trigger));
onSettingsChanged((settings) => (trigger = settings.trigger));

// Shows the pop-up for the word at the point, or hides it if there's none.
async function lookUp(x: number, y: number): Promise<void> {
  const lookup = ++latestLookup;
  const found = getTextAtPoint(x, y);
  if (!found) {
    hidePopup();
    return;
  }

  const message: LookupMessage = { type: "lookup", text: found.text };
  const matches: WordMatch[] = await chrome.runtime.sendMessage(message);
  if (lookup !== latestLookup) return;

  if (matches.length > 0) {
    showPopup(matches, x, y);
    shownSentence = found.sentence;
  } else {
    hidePopup();
  }
}

// Checks whether the extension reloaded and left this copy of the script behind.
function isOrphaned(): boolean {
  return !chrome.runtime?.id;
}

// Looks up the word under the cursor, right away with Shift or after a pause in hover mode.
document.addEventListener("mousemove", (event) => {
  if (isOrphaned()) return;
  clearTimeout(hoverTimer);
  latestLookup++;

  if (trigger === "hover") {
    hoverTimer = window.setTimeout(
      () => lookUp(event.clientX, event.clientY),
      HOVER_DELAY,
    );
  } else if (event.shiftKey) {
    lookUp(event.clientX, event.clientY);
  } else {
    hidePopup();
  }
});

// Checks whether the key press is going into a text box.
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

// Saves the entry at that spot in the pop-up and shows how it went.
async function saveShownEntry(index: number): Promise<void> {
  const entry = getShownEntries()[index];
  if (!entry) return;

  const word = entry.kanji[0] ?? entry.readings[0] ?? "";
  setPopupStatus(`Saving ${word}…`);
  const sentence = shownSentence;
  const message: AddCardMessage = {
    type: "addCard",
    entry,
    sentence,
    translation: await translateSentence(sentence),
  };
  const result: AddCardResult = await chrome.runtime.sendMessage(message);
  setPopupStatus(SAVE_RESULTS[result](word));
}

// Picks which entry a key press saves: A for the top one, 1–3 for that one.
// Digits are read by key position, so they still work while Shift is held.
function entryIndexForKey(event: KeyboardEvent): number | null {
  if (event.key.toLowerCase() === "a") return 0;
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
  return digit ? Number(digit[1]) - 1 : null;
}

// Closes the pop-up on Escape and saves an entry on A or 1–3.
document.addEventListener("keydown", (event) => {
  if (isOrphaned()) return;
  if (event.key === "Escape") hidePopup();
  if (isTyping(event.target)) return;

  const index = entryIndexForKey(event);
  if (index !== null) saveShownEntry(index);
});
