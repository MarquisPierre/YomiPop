import type { DictionaryEntry, WordMatch } from "../dictionary/types";

// Sets the gap between the cursor and the pop-up.
const CURSOR_OFFSET = 12;

// Sets how many entries the pop-up shows at once.
const MAX_ENTRIES = 3;

// Styles the pop-up. The shadow root keeps the page's CSS out.
const STYLES = `
  .popup {
    position: fixed;
    z-index: 2147483647;
    max-width: 320px;
    padding: 10px 12px;
    border-radius: 8px;
    background: #1f2328;
    color: #f0f3f6;
    font: 14px/1.4 system-ui, sans-serif;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    pointer-events: none;
  }
  .number { margin-right: 8px; color: #9fb3c8; font-size: 12px; }
  .word { font-size: 22px; font-weight: 600; }
  .reasons { font-size: 12px; color: #9fb3c8; }
  .reading { margin-left: 8px; color: #9fb3c8; }
  .saved { margin-left: 8px; color: #7ee787; font-size: 12px; }
  .meanings { margin: 6px 0 0; padding-left: 18px; }
  .entry + .entry { margin-top: 10px; padding-top: 10px; border-top: 1px solid #3a4048; }
  .status { margin-top: 8px; padding-top: 6px; border-top: 1px solid #3a4048; font-size: 12px; color: #9fb3c8; }
  /* Lists the meanings without the usual numbers, since each line shows its own. */
  .picker { margin: 6px 0 0; padding: 0; list-style: none; }
  /* Greys out meanings that won't be saved. */
  .unchosen { color: #6e7781; }
  /* Lets the pop-up take clicks while picking, and only then. */
  .popup.picking { pointer-events: auto; }
  /* Shows each meaning can be clicked. */
  .picker li { cursor: pointer; border-radius: 4px; padding: 1px 4px; }
  .picker li:hover { background: #2d333b; }
  /* Styles the Save and Cancel buttons in the footer. */
  .status button { margin-left: 8px; padding: 2px 8px; border: none; border-radius: 4px; background: #f0f3f6; color: #1f2328; font: inherit; cursor: pointer; }
  .status button.secondary { background: transparent; color: #9fb3c8; }
`;

let popup: HTMLDivElement | null = null;
let status: HTMLDivElement | null = null;
let shownEntries: DictionaryEntry[] = [];

// Builds the pop-up once and attaches it to the page.
function createPopup(): HTMLDivElement {
  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = STYLES;

  const element = document.createElement("div");
  element.className = "popup";
  element.setAttribute("role", "tooltip");
  element.hidden = true;

  shadow.append(style, element);
  document.documentElement.append(host);
  return element;
}

// Shows the matches next to the given point.
export function showPopup(
  matches: WordMatch[],
  x: number,
  y: number,
  deckName: string | null,
): void {
  popup ??= createPopup();
  const shown = matches.slice(0, MAX_ENTRIES);
  shownEntries = shown.map((match) => match.entry);

  status = document.createElement("div");
  status.className = "status";
  // Tells the user which keys save, where to, and that P picks meanings.
  const where = deckName ? ` to ${deckName}` : "";
  status.textContent =
    shown.length > 1
      ? `A or 1–${shown.length} to save${where} · P to pick`
      : `A to save${where} · P to pick`;

  const numbered = shown.length > 1;
  popup.replaceChildren(
    ...shown.map((match, index) =>
      renderMatch(match, numbered ? index + 1 : null),
    ),
    status,
  );
  // Goes back to ignoring the mouse, so it never blocks hovering.
  popup.classList.remove("picking");
  popup.hidden = false;
  positionPopup(popup, x, y);
}

// Replaces the footer text, e.g. after saving a card.
export function setPopupStatus(text: string): void {
  if (status) status.textContent = text;
}

// Lists the entries on screen, or none if the pop-up is hidden.
export function getShownEntries(): DictionaryEntry[] {
  return popup && !popup.hidden ? shownEntries : [];
}

// Sets how many meanings the picker offers, one per number key.
export const MAX_PICKABLE = 9;

// Lists what the picker does when the user clicks: tick a meaning, save, or cancel.
export interface PickerActions {
  toggle: (sense: number) => void;
  save: () => void;
  cancel: () => void;
}

// Swaps the pop-up to a checklist of one entry's meanings, for picking which to save.
// It stays where it is, since the cursor is free to wander while picking.
export function showPicker(
  index: number,
  chosen: Set<number>,
  actions: PickerActions,
): void {
  // Stops if the pop-up is gone or there's no entry at that spot.
  const entry = shownEntries[index];
  if (!popup || !entry) return;

  // Holds the word and its checklist.
  const element = document.createElement("div");
  element.className = "entry";

  // Shows the word at the top, like the normal pop-up.
  const word = document.createElement("span");
  word.className = "word";
  word.lang = "ja";
  word.textContent = entry.kanji[0] ?? entry.readings[0] ?? "";
  element.append(word);

  // Lists each meaning with its number key and whether it's ticked.
  // Clicking a line ticks or unticks it, like its number key.
  const list = document.createElement("ol");
  list.className = "picker";
  entry.senses.slice(0, MAX_PICKABLE).forEach((sense, i) => {
    const item = document.createElement("li");
    item.textContent = `${chosen.has(i) ? "☑" : "☐"} ${i + 1}  ${sense.meanings.join("; ")}`;
    // Greys out the line when it's unticked.
    if (!chosen.has(i)) item.className = "unchosen";
    item.addEventListener("click", () => actions.toggle(i));
    list.append(item);
  });
  element.append(list);

  // Shows the key hints with Save and Cancel buttons for the mouse.
  // Reuses the footer, so "Saved ✓" can replace them later.
  status = document.createElement("div");
  status.className = "status";
  status.textContent = "1–9 tick · Enter save · Esc cancel";
  const save = document.createElement("button");
  save.textContent = "Save";
  save.addEventListener("click", actions.save);
  const cancel = document.createElement("button");
  cancel.className = "secondary";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", actions.cancel);
  status.append(save, cancel);

  // Replaces what the pop-up showed, keeping it in the same place, and lets it take clicks.
  popup.replaceChildren(element, status);
  popup.classList.add("picking");
}

// Builds the number, word, reading, saved badge, conjugations and meanings for one match.
function renderMatch(
  { entry, reasons, saved }: WordMatch,
  number: number | null,
): HTMLDivElement {
  const element = document.createElement("div");
  element.className = "entry";

  if (number !== null) {
    const label = document.createElement("span");
    label.className = "number";
    label.textContent = String(number);
    element.append(label);
  }

  const word = document.createElement("span");
  word.className = "word";
  word.lang = "ja";
  word.textContent = entry.kanji[0] ?? entry.readings[0] ?? "";

  const reading = document.createElement("span");
  reading.className = "reading";
  reading.lang = "ja";
  reading.textContent = entry.kanji.length > 0 ? (entry.readings[0] ?? "") : "";

  element.append(word, reading);

  if (saved) {
    const badge = document.createElement("span");
    badge.className = "saved";
    badge.textContent = "✓ Saved";
    element.append(badge);
  }

  if (reasons.length > 0) {
    const conjugations = document.createElement("div");
    conjugations.className = "reasons";
    conjugations.textContent = reasons.join(" · ");
    element.append(conjugations);
  }

  const meanings = document.createElement("ol");
  meanings.className = "meanings";
  for (const sense of entry.senses) {
    const item = document.createElement("li");
    item.textContent = sense.meanings.join("; ");
    meanings.append(item);
  }

  element.append(meanings);
  return element;
}

// Hides the pop-up if it's showing.
export function hidePopup(): void {
  if (!popup) return;
  popup.hidden = true;
  // Goes back to ignoring the mouse, so it never blocks hovering.
  popup.classList.remove("picking");
}

// Places the pop-up below and to the right of the point, flipping it to stay on screen.
function positionPopup(element: HTMLDivElement, x: number, y: number): void {
  const { width, height } = element.getBoundingClientRect();

  let left = x + CURSOR_OFFSET;
  let top = y + CURSOR_OFFSET;
  if (left + width > window.innerWidth) left = x - width - CURSOR_OFFSET;
  if (top + height > window.innerHeight) top = y - height - CURSOR_OFFSET;

  element.style.left = `${Math.max(0, left)}px`;
  element.style.top = `${Math.max(0, top)}px`;
}
