import type { WordMatch } from "../dictionary/types";
import type { AddCardMessage, AddCardResult, LookupMessage } from "../messages";
import { getSettings, onSettingsChanged, type Trigger } from "../settings";
import { getTextAtPoint } from "./getTextAtPoint";
import {
  getShownEntries,
  hidePopup,
  MAX_PICKABLE,
  setPopupStatus,
  showPicker,
  showPopup,
  type PickerActions,
} from "./popup";
import { translateSentence } from "./translate";

// Sets how long the cursor must rest on a word in hover mode.
const HOVER_DELAY = 150;

// Builds the footer text for each way saving a word can end.
const SAVE_RESULTS: Record<AddCardResult, (word: string) => string> = {
  added: (word) => `Saved ${word} ✓`,
  exists: (word) => `${word} is already saved`,
  loggedOut: () => "Log in from the YomiPop menu",
  noDeck: () => "Pick a deck in the YomiPop menu",
  error: () => "Couldn't save (is the API running?)",
};

let trigger: Trigger = "shift";
let deckName: string | null = null;
let latestLookup = 0;
let hoverTimer: number | undefined;
let shownSentence = "";
// Holds the open meaning picker: which entry it's for and which meanings are ticked.
let picking: { index: number; chosen: Set<number> } | null = null;

getSettings().then((settings) => {
  trigger = settings.trigger;
  deckName = settings.deckName;
});
onSettingsChanged((settings) => {
  trigger = settings.trigger;
  deckName = settings.deckName;
});

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
    showPopup(matches, x, y, deckName);
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
  // Keeps the pop-up still while picking meanings.
  if (picking) return;
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
// When meanings were picked, only those go on the card.
async function saveShownEntry(
  index: number,
  chosen?: Set<number>,
): Promise<void> {
  const shown = getShownEntries()[index];
  if (!shown) return;

  // Keeps only the ticked meanings, leaving the rest of the entry as it was.
  const entry = chosen
    ? { ...shown, senses: shown.senses.filter((_, i) => chosen.has(i)) }
    : shown;

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

// Reads which number key was pressed, 1–9, or null for any other key.
// Digits are read by key position, so they still work while Shift is held.
function digitForKey(event: KeyboardEvent): number | null {
  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
  return digit ? Number(digit[1]) : null;
}

// Picks which entry a key press saves: A for the top one, 1–3 for that one.
function entryIndexForKey(event: KeyboardEvent): number | null {
  if (event.key.toLowerCase() === "a") return 0;
  const digit = digitForKey(event);
  return digit === null ? null : digit - 1;
}

// Opens the meaning picker for the top entry, with nothing ticked yet.
function startPicking(): void {
  const entry = getShownEntries()[0];
  if (!entry) return;

  // Cancels any lookup still on its way, so it can't replace the picker.
  clearTimeout(hoverTimer);
  latestLookup++;

  picking = { index: 0, chosen: new Set() };
  showPicker(picking.index, picking.chosen, PICKER_ACTIONS);
}

// Ticks or unticks a meaning in the open picker and redraws it.
function toggleSense(sense: number): void {
  if (!picking) return;
  if (picking.chosen.has(sense)) picking.chosen.delete(sense);
  else picking.chosen.add(sense);
  showPicker(picking.index, picking.chosen, PICKER_ACTIONS);
}

// Saves the ticked meanings and closes the picker, unless none are ticked.
function savePicked(): void {
  if (!picking) return;
  if (picking.chosen.size === 0) {
    setPopupStatus("Tick at least one meaning");
    return;
  }
  const { index, chosen } = picking;
  picking = null;
  saveShownEntry(index, chosen);
}

// Closes the picker without saving.
function cancelPicking(): void {
  picking = null;
  hidePopup();
}

// Connects the picker's clicks to the same steps as its keys.
const PICKER_ACTIONS: PickerActions = {
  toggle: toggleSense,
  save: savePicked,
  cancel: cancelPicking,
};

// Handles keys while the picker is open: numbers tick, Enter saves, Escape cancels.
// Other keys are left alone, so browser shortcuts still work.
function handlePickerKey(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    cancelPicking();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    savePicked();
    return;
  }

  // Ticks or unticks the meaning at that number, if the entry has one there.
  const digit = digitForKey(event);
  const entry = picking && getShownEntries()[picking.index];
  if (digit === null || !entry) return;
  if (digit > Math.min(entry.senses.length, MAX_PICKABLE)) return;
  event.preventDefault();
  toggleSense(digit - 1);
}

// Sends keys to the picker while it's open. Otherwise closes the pop-up on Escape,
// opens the picker on P, and saves an entry on A or 1–3.
document.addEventListener("keydown", (event) => {
  if (isOrphaned()) return;
  if (picking) {
    handlePickerKey(event);
    return;
  }

  if (event.key === "Escape") hidePopup();
  if (isTyping(event.target)) return;

  // Reads P by key position, so it works while Shift is held.
  if (event.code === "KeyP") {
    startPicking();
    return;
  }

  const index = entryIndexForKey(event);
  if (index !== null) saveShownEntry(index);
});
