import type { DictionaryEntry } from "../dictionary/types";
import type { AddCardMessage, AddCardResult, LookupMessage } from "../messages";
import { getSettings, onSettingsChanged, type Trigger } from "../settings";
import { getTextAtPoint } from "./getTextAtPoint";
import { getShownEntries, hidePopup, setPopupStatus, showPopup } from "./popup";

// Sets how long the cursor must rest on a word in hover mode.
const HOVER_DELAY = 150;

// Sets the footer text for each way saving can end.
const SAVE_RESULTS: Record<AddCardResult, string> = {
  added: "Saved ✓",
  exists: "Already saved",
  error: "Couldn't save (is the API running?)",
};

let trigger: Trigger = "shift";
let latestLookup = 0;
let hoverTimer: number | undefined;

getSettings().then((settings) => (trigger = settings.trigger));
onSettingsChanged((settings) => (trigger = settings.trigger));

// Shows the pop-up for the word at the point, or hides it if there's none.
async function lookUp(x: number, y: number): Promise<void> {
  const lookup = ++latestLookup;
  const text = getTextAtPoint(x, y);
  if (!text) {
    hidePopup();
    return;
  }

  const message: LookupMessage = { type: "lookup", text };
  const entries: DictionaryEntry[] = await chrome.runtime.sendMessage(message);
  if (lookup !== latestLookup) return;

  if (entries.length > 0) showPopup(entries, x, y);
  else hidePopup();
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

// Saves the top entry in the pop-up and shows how it went.
async function saveShownEntry(): Promise<void> {
  const entry = getShownEntries()[0];
  if (!entry) return;

  setPopupStatus("Saving…");
  const message: AddCardMessage = { type: "addCard", entry };
  const result: AddCardResult = await chrome.runtime.sendMessage(message);
  setPopupStatus(SAVE_RESULTS[result]);
}

// Closes the pop-up on Escape and saves the top entry on A.
document.addEventListener("keydown", (event) => {
  if (isOrphaned()) return;
  if (event.key === "Escape") hidePopup();
  if (event.key.toLowerCase() === "a" && !isTyping(event.target)) {
    saveShownEntry();
  }
});
