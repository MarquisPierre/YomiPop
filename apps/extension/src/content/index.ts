import type { DictionaryEntry } from "../dictionary/types";
import type { LookupMessage } from "../messages";
import { getTextAtPoint } from "./getTextAtPoint";
import { hidePopup, showPopup } from "./popup";

let latestLookup = 0;

// Looks up the word under the cursor while Shift is held.
document.addEventListener("mousemove", async (event) => {
  const lookup = ++latestLookup;
  if (!event.shiftKey) {
    hidePopup();
    return;
  }

  const text = getTextAtPoint(event.clientX, event.clientY);
  if (!text) {
    hidePopup();
    return;
  }

  const message: LookupMessage = { type: "lookup", text };
  const entries: DictionaryEntry[] = await chrome.runtime.sendMessage(message);
  if (lookup !== latestLookup) return;

  if (entries.length > 0) showPopup(entries, event.clientX, event.clientY);
  else hidePopup();
});

// Closes the pop-up on Escape.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hidePopup();
});
