import type { DictionaryEntry } from "../dictionary/types";
import type { LookupMessage } from "../messages";
import { getSettings, onSettingsChanged, type Trigger } from "../settings";
import { getTextAtPoint } from "./getTextAtPoint";
import { hidePopup, showPopup } from "./popup";

// Sets how long the cursor must rest on a word in hover mode.
const HOVER_DELAY = 150;

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

// Looks up the word under the cursor, right away with Shift or after a pause in hover mode.
document.addEventListener("mousemove", (event) => {
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

// Closes the pop-up on Escape.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hidePopup();
});
