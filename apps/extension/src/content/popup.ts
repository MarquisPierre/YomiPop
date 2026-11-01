import type { DictionaryEntry, WordMatch } from "../dictionary/types";
import type { ExampleSentence, Explanation, FoundImage } from "../messages";

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
  /* Separates the sentence and picture sections. */
  .section { margin-top: 8px; padding-top: 6px; border-top: 1px solid #3a4048; }
  .label { margin-right: 6px; color: #9fb3c8; font-size: 12px; }
  /* Styles the small buttons in each section; the chosen one is filled in. */
  .chip { margin-right: 4px; padding: 1px 8px; border: 1px solid #3a4048; border-radius: 4px; background: transparent; color: #f0f3f6; font: inherit; font-size: 12px; cursor: pointer; }
  .chip.on { background: #f0f3f6; color: #1f2328; }
  .sentence { margin-top: 4px; }
  .english { color: #9fb3c8; font-size: 12px; }
  /* Shows short messages like "Writing sentences…" or the daily limit. */
  .note { color: #9fb3c8; font-size: 12px; font-style: italic; }
  /* Fits the picture to the pop-up's width without making it too tall. */
  .photo { display: block; width: 100%; max-height: 160px; margin-top: 4px; border-radius: 4px; object-fit: cover; }
  .credit { color: #6e7781; font-size: 11px; }
  /* Shows the small ✨ Explain button next to selected Japanese text. */
  .explain-button { position: fixed; z-index: 2147483647; padding: 2px 8px; border: none; border-radius: 6px; background: #1f2328; color: #f0f3f6; font: 12px system-ui, sans-serif; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); cursor: pointer; }
  .translation { margin-top: 6px; }
  .notes { margin: 6px 0 0; padding-left: 18px; }
  .part { font-weight: 600; }
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

// Describes what the card builder shows: the ticked meanings, the sentence and the picture.
export interface BuilderView {
  index: number;
  chosen: Set<number>;
  // Says which sentence is chosen; the AI one may still be loading or have failed.
  sentenceSource: "page" | "ai";
  pageSentence: string;
  aiSentence: ExampleSentence | null;
  // Holds a message to show instead of the sentence or picture, like "Writing sentences…".
  sentenceNote: string | null;
  image: FoundImage | null;
  imageNote: string | null;
}

// Lists what the builder's buttons do.
export interface BuilderActions {
  toggle: (sense: number) => void;
  usePageSentence: () => void;
  useAiSentence: () => void;
  nextSentence: () => void;
  findImage: () => void;
  nextImage: () => void;
  removeImage: () => void;
  save: () => void;
  cancel: () => void;
}

// Makes a small button for the builder, filled in when it's the chosen option.
function chip(
  text: string,
  onClick: () => void,
  on = false,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = on ? "chip on" : "chip";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

// Makes a short grey line of text, for sentences' English, notes and credits.
function line(className: string, text: string, lang?: string): HTMLDivElement {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text;
  if (lang) element.lang = lang;
  return element;
}

// Swaps the pop-up to the card builder: meanings to tick, a sentence and a picture to choose.
// It stays where it is, since the cursor is free to wander while building.
export function showBuilder(view: BuilderView, actions: BuilderActions): void {
  const entry = shownEntries[view.index];
  if (!popup || !entry) return;

  // Shows the word and its meanings, each clickable or ticked with its number key.
  const element = document.createElement("div");
  element.className = "entry";
  const word = line("word", entry.kanji[0] ?? entry.readings[0] ?? "", "ja");
  const list = document.createElement("ol");
  list.className = "picker";
  entry.senses.slice(0, MAX_PICKABLE).forEach((sense, i) => {
    const item = document.createElement("li");
    item.textContent = `${view.chosen.has(i) ? "☑" : "☐"} ${i + 1}  ${sense.meanings.join("; ")}`;
    if (!view.chosen.has(i)) item.className = "unchosen";
    item.addEventListener("click", () => actions.toggle(i));
    list.append(item);
  });
  element.append(word, list);

  // Lets the user choose the page's sentence or an AI one, and get a new AI one.
  const sentence = document.createElement("div");
  sentence.className = "section";
  const ai = view.sentenceSource === "ai";
  sentence.append(
    line("label", "Sentence"),
    chip("Page", actions.usePageSentence, !ai),
    chip("AI", actions.useAiSentence, ai),
  );
  if (ai && view.aiSentence) {
    sentence.append(chip("🔄 New one", actions.nextSentence));
  }
  if (view.sentenceNote) {
    sentence.append(line("note", view.sentenceNote));
  } else if (ai && view.aiSentence) {
    sentence.append(
      line("sentence", view.aiSentence.japanese, "ja"),
      line("english", view.aiSentence.english),
    );
  } else {
    sentence.append(
      line("sentence", view.pageSentence || "(no sentence on the page)", "ja"),
    );
  }

  // Lets the user find a picture, try another, or have none.
  const picture = document.createElement("div");
  picture.className = "section";
  picture.append(line("label", "Picture"));
  if (view.image) {
    picture.append(
      chip("🔄 Another", actions.nextImage),
      chip("✕ None", actions.removeImage),
    );
    const photo = document.createElement("img");
    photo.className = "photo";
    photo.src = view.image.url;
    photo.alt = "";
    // Some sites block outside pictures; the picture still saves to the card.
    photo.addEventListener("error", () =>
      photo.replaceWith(
        line(
          "note",
          "This site blocks the preview, but the picture will still save.",
        ),
      ),
    );
    picture.append(photo, line("credit", view.image.attribution));
  } else {
    picture.append(chip("Find picture", actions.findImage));
  }
  if (view.imageNote) picture.append(line("note", view.imageNote));

  // Shows the key hints with Save and Cancel, as before.
  status = document.createElement("div");
  status.className = "status";
  status.textContent = "1–9 tick · Enter save · Esc cancel";
  status.append(
    chip("Save", actions.save, true),
    chip("Cancel", actions.cancel),
  );

  popup.replaceChildren(element, sentence, picture, status);
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

let explainButton: HTMLButtonElement | null = null;

// Shows the ✨ Explain button just below the end of the selection.
export function showExplainButton(rect: DOMRect, onClick: () => void): void {
  popup ??= createPopup();
  if (!explainButton) {
    explainButton = document.createElement("button");
    explainButton.className = "explain-button";
    explainButton.textContent = "✨ Explain";
    // Keeps the selection from clearing when the button is pressed.
    explainButton.addEventListener("mousedown", (event) =>
      event.preventDefault(),
    );
    popup.after(explainButton);
  }
  explainButton.onclick = onClick;
  explainButton.style.left = `${Math.min(rect.right, window.innerWidth - 90)}px`;
  explainButton.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - 30)}px`;
  explainButton.hidden = false;
}

// Hides the ✨ Explain button.
export function hideExplainButton(): void {
  if (explainButton) explainButton.hidden = true;
}

// Shows a sentence's translation and grammar notes below the selection, or a note while it loads or fails.
export function showExplanation(
  sentence: string,
  explanation: Explanation | null,
  note: string | null,
  rect: DOMRect,
  onClose: () => void,
): void {
  popup ??= createPopup();
  const parts: HTMLElement[] = [line("sentence", `✨ ${sentence}`, "ja")];
  if (note) parts.push(line("note", note));
  if (explanation) {
    parts.push(line("translation", explanation.translation));
    const notes = document.createElement("ul");
    notes.className = "notes";
    for (const { part, explanation: text } of explanation.notes) {
      const item = document.createElement("li");
      const label = document.createElement("span");
      label.className = "part";
      label.lang = "ja";
      label.textContent = part;
      // Shows AI text as plain text only, as the build plan's security section asks.
      item.append(label, document.createTextNode(` — ${text}`));
      notes.append(item);
    }
    parts.push(notes);
  }
  status = document.createElement("div");
  status.className = "status";
  status.textContent = "Esc to close";
  status.append(chip("Close", onClose));
  popup.replaceChildren(...parts, status);
  popup.classList.add("picking");
  popup.hidden = false;
  positionPopup(popup, rect.left, rect.bottom);
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
