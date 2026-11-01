import type { WordMatch } from "../dictionary/types";
import type {
  AddCardMessage,
  AddCardResult,
  AiMessage,
  AiResult,
  ExampleSentence,
  ExplainMessage,
  ExplainResult,
  FoundImage,
  LookupMessage,
} from "../messages";
import { getSettings, onSettingsChanged, type Trigger } from "../settings";
import { getTextAtPoint } from "./getTextAtPoint";
import {
  getShownEntries,
  hideExplainButton,
  hidePopup,
  MAX_PICKABLE,
  setPopupStatus,
  showBuilder,
  showExplainButton,
  showExplanation,
  showPopup,
  type BuilderActions,
} from "./popup";
import { speak } from "./speak";
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
// Holds the open card builder: the entry, its ticked meanings, and the sentence and picture choices.
interface Builder {
  index: number;
  chosen: Set<number>;
  pageSentence: string;
  sentenceSource: "page" | "ai";
  aiSentences: ExampleSentence[];
  aiIndex: number;
  sentenceNote: string | null;
  images: FoundImage[];
  // Points at the picture being shown, or -1 for none.
  imageIndex: number;
  imageNote: string | null;
}
let building: Builder | null = null;

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
  // Keeps the pop-up still while picking meanings or reading an explanation.
  if (building || explaining) return;
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
// When meanings were picked, only those go on the card, with any AI sentence and picture chosen.
async function saveShownEntry(
  index: number,
  chosen?: Set<number>,
  extras: { aiSentence?: ExampleSentence; image?: FoundImage } = {},
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
    // Skips Chrome's translator for an AI sentence, which already has its English.
    translation: extras.aiSentence ? null : await translateSentence(sentence),
    ...extras,
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

// Draws the builder as it stands now.
function redraw(): void {
  if (!building) return;
  const b = building;
  showBuilder(
    {
      index: b.index,
      chosen: b.chosen,
      sentenceSource: b.sentenceSource,
      pageSentence: b.pageSentence,
      aiSentence: b.aiSentences[b.aiIndex] ?? null,
      sentenceNote: b.sentenceNote,
      image: b.images[b.imageIndex] ?? null,
      imageNote: b.imageNote,
    },
    BUILDER_ACTIONS,
  );
}

// Opens the card builder for the top entry, with nothing ticked and the page's sentence.
function startBuilding(): void {
  if (!getShownEntries()[0]) return;
  // Cancels any lookup still on its way, so it can't replace the builder.
  clearTimeout(hoverTimer);
  latestLookup++;
  building = {
    index: 0,
    chosen: new Set(),
    pageSentence: shownSentence,
    sentenceSource: "page",
    aiSentences: [],
    aiIndex: 0,
    sentenceNote: null,
    images: [],
    imageIndex: -1,
    imageNote: null,
  };
  redraw();
}

// Asks the API, through the background, for AI sentences or pictures for the builder's word.
// Uses the ticked meanings, or the first one when none are ticked yet.
async function askAi<T>(
  b: Builder,
  type: AiMessage["type"],
  fresh: boolean,
): Promise<AiResult<T>> {
  const entry = getShownEntries()[b.index]!;
  const ticked = entry.senses.filter((_, i) => b.chosen.has(i));
  const senses = ticked.length > 0 ? ticked : entry.senses.slice(0, 1);
  const message: AiMessage = {
    type,
    word: entry.kanji[0] ?? entry.readings[0] ?? "",
    reading: entry.readings[0] ?? "",
    meaning: senses.map((sense) => sense.meanings.join("; ")).join("; "),
    fresh,
  };
  return chrome.runtime.sendMessage(message);
}

// Loads 3 AI sentences, showing a note while waiting or if it fails.
// Fresh asks for new ones instead of the saved ones.
async function loadSentences(fresh: boolean): Promise<void> {
  const b = building;
  if (!b) return;
  b.sentenceNote = "Writing sentences…";
  redraw();
  const result = await askAi<ExampleSentence>(b, "aiSentences", fresh);
  // Ignores the answer if the builder was closed or reopened meanwhile.
  if (building !== b) return;
  if (result.ok) {
    b.aiSentences = result.items;
    b.aiIndex = 0;
    b.sentenceNote = null;
  } else {
    b.sentenceNote = result.message;
  }
  redraw();
}

// Loads pictures, the same way as sentences.
async function loadImages(fresh: boolean): Promise<void> {
  const b = building;
  if (!b) return;
  b.imageNote = "Finding pictures…";
  redraw();
  const result = await askAi<FoundImage>(b, "aiImages", fresh);
  if (building !== b) return;
  if (result.ok) {
    b.images = result.items;
    b.imageIndex = 0;
    b.imageNote = null;
  } else {
    b.imageNote = result.message;
  }
  redraw();
}

// Connects the builder's buttons and keys to what they do.
const BUILDER_ACTIONS: BuilderActions = {
  // Ticks or unticks a meaning.
  toggle(sense) {
    if (!building) return;
    if (building.chosen.has(sense)) building.chosen.delete(sense);
    else building.chosen.add(sense);
    redraw();
  },
  // Goes back to the page's sentence. The AI ones are kept in case the user switches back.
  usePageSentence() {
    if (!building) return;
    building.sentenceSource = "page";
    building.sentenceNote = null;
    redraw();
  },
  // Shows an AI sentence, loading them the first time.
  useAiSentence() {
    if (!building) return;
    building.sentenceSource = "ai";
    if (building.aiSentences.length > 0) redraw();
    else loadSentences(false);
  },
  // Shows the next AI sentence, or asks for new ones after the last.
  nextSentence() {
    if (!building) return;
    if (building.aiIndex + 1 < building.aiSentences.length) {
      building.aiIndex++;
      redraw();
    } else {
      loadSentences(true);
    }
  },
  // Shows a picture, loading them the first time.
  findImage() {
    if (!building) return;
    if (building.images.length > 0) {
      building.imageIndex = 0;
      redraw();
    } else {
      loadImages(false);
    }
  },
  // Shows the next picture, or asks for new ones after the last.
  nextImage() {
    if (!building) return;
    if (building.imageIndex + 1 < building.images.length) {
      building.imageIndex++;
      redraw();
    } else {
      loadImages(true);
    }
  },
  // Saves the card without a picture.
  removeImage() {
    if (!building) return;
    building.imageIndex = -1;
    redraw();
  },
  // Saves the card with what's chosen, unless something is missing.
  save() {
    const b = building;
    if (!b) return;
    if (b.chosen.size === 0) {
      setPopupStatus("Tick at least one meaning");
      return;
    }
    const aiSentence =
      b.sentenceSource === "ai" ? b.aiSentences[b.aiIndex] : undefined;
    if (b.sentenceSource === "ai" && !aiSentence) {
      setPopupStatus("Wait for the AI sentence, or choose Page");
      return;
    }
    building = null;
    saveShownEntry(b.index, b.chosen, {
      aiSentence,
      image: b.images[b.imageIndex],
    });
  },
  // Closes the builder without saving.
  cancel() {
    building = null;
    hidePopup();
  },
  // Reads Japanese text aloud with the natural AI voice.
  speak(text) {
    speak(text);
  },
};

// Handles keys while the builder is open: numbers tick, Enter saves, Escape cancels.
// Other keys are left alone, so browser shortcuts still work.
function handleBuilderKey(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    event.preventDefault();
    BUILDER_ACTIONS.cancel();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    BUILDER_ACTIONS.save();
    return;
  }

  // Ticks or unticks the meaning at that number, if the entry has one there.
  const digit = digitForKey(event);
  const entry = building && getShownEntries()[building.index];
  if (digit === null || !entry) return;
  if (digit > Math.min(entry.senses.length, MAX_PICKABLE)) return;
  event.preventDefault();
  BUILDER_ACTIONS.toggle(digit - 1);
}

// Matches hiragana, katakana and kanji, to tell whether a selection is Japanese.
const JAPANESE = /[\u3040-\u30ff\u3400-\u9fff]/;

// Caps how long a selection can be explained, matching the API's limit.
const MAX_EXPLAIN_LENGTH = 300;

// Holds the explanation on screen: the sentence and where it sits. Lookups pause while it's open.
let explaining: { sentence: string; rect: DOMRect } | null = null;

// Returns the selected Japanese text and where it is, or null when nothing explainable is selected.
function selectedJapanese(): { text: string; rect: DOMRect } | null {
  const selection = window.getSelection();
  const text = selection?.toString().trim() ?? "";
  if (!selection || selection.rangeCount === 0) return null;
  if (!JAPANESE.test(text) || text.length > MAX_EXPLAIN_LENGTH) return null;
  return { text, rect: selection.getRangeAt(0).getBoundingClientRect() };
}

// Shows or hides the ✨ Explain button after the selection changes, by mouse or keyboard.
function updateExplainButton(): void {
  if (isOrphaned() || building || explaining) return;
  const selected = selectedJapanese();
  if (selected) showExplainButton(selected.rect, explainSelection);
  else hideExplainButton();
}
document.addEventListener("mouseup", updateExplainButton);
document.addEventListener("keyup", updateExplainButton);

// Explains the selected sentence, showing "Explaining…" until the answer arrives.
async function explainSelection(): Promise<void> {
  const selected = selectedJapanese();
  if (!selected) return;
  hideExplainButton();
  const mine = (explaining = { sentence: selected.text, rect: selected.rect });
  showExplanation(
    mine.sentence,
    null,
    "Explaining…",
    mine.rect,
    closeExplanation,
  );

  const message: ExplainMessage = { type: "explain", sentence: mine.sentence };
  const result: ExplainResult = await chrome.runtime.sendMessage(message);
  // Ignores the answer if the explanation was closed or replaced meanwhile.
  if (explaining !== mine) return;
  if (result.ok) {
    showExplanation(
      mine.sentence,
      result.explanation,
      null,
      mine.rect,
      closeExplanation,
    );
  } else {
    showExplanation(
      mine.sentence,
      null,
      result.message,
      mine.rect,
      closeExplanation,
    );
  }
}

// Closes the explanation and lets lookups carry on.
function closeExplanation(): void {
  explaining = null;
  hidePopup();
}

// Sends keys to the builder while it's open. Otherwise closes the pop-up on Escape,
// opens the builder on P, and saves an entry on A or 1–3.
document.addEventListener("keydown", (event) => {
  if (isOrphaned()) return;
  if (explaining && event.key === "Escape") {
    closeExplanation();
    return;
  }
  if (building) {
    handleBuilderKey(event);
    return;
  }

  if (event.key === "Escape") hidePopup();
  if (isTyping(event.target)) return;

  // Reads P by key position, so it works while Shift is held.
  if (event.code === "KeyP") {
    startBuilding();
    return;
  }

  // Reads the top word aloud on R, by key position like A and P.
  if (event.code === "KeyR") {
    const entry = getShownEntries()[0];
    if (entry) speak(entry.readings[0] ?? entry.kanji[0] ?? "");
    return;
  }

  // Explains the selected Japanese text on E, read by key position like P.
  if (event.code === "KeyE" && selectedJapanese()) {
    explainSelection();
    return;
  }

  const index = entryIndexForKey(event);
  if (index !== null) saveShownEntry(index);
});
