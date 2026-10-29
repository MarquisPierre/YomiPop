import { findWord } from "../dictionary/fakeDictionary";
import { getTextAtPoint } from "./getTextAtPoint";
import { hidePopup, showPopup } from "./popup";

// Looks up the word under the cursor while Shift is held.
document.addEventListener("mousemove", (event) => {
  if (!event.shiftKey) {
    hidePopup();
    return;
  }

  const text = getTextAtPoint(event.clientX, event.clientY);
  const entry = text ? findWord(text) : undefined;

  if (entry) {
    showPopup(entry, event.clientX, event.clientY);
  } else {
    hidePopup();
  }
});

// Closes the pop-up on Escape.
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hidePopup();
});
