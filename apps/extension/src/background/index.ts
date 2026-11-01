import type { WordMatch } from "../dictionary/types";
import type { Message } from "../messages";
import { addCard } from "./addCard";
import { findWord } from "./findWord";
import { injectIntoOpenTabs } from "./injectIntoOpenTabs";
import { loadDictionary } from "./loadDictionary";
import { getSavedEntries } from "./savedEntries";

// Loads the dictionary, logging any failure.
function load(): void {
  loadDictionary().catch((error) =>
    console.error("Dictionary load failed", error),
  );
}

chrome.runtime.onInstalled.addListener(() => {
  load();
  injectIntoOpenTabs();
});
chrome.runtime.onStartup.addListener(load);

// Finds the matches for the text and marks the ones the user has saved.
async function lookUp(text: string): Promise<WordMatch[]> {
  const [matches, saved] = await Promise.all([
    findWord(text),
    getSavedEntries(),
  ]);
  return matches.map((match) => ({
    ...match,
    saved: saved.has(match.entry.id),
  }));
}

// Answers lookups and save requests from the content script.
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === "lookup") {
      lookUp(message.text).then(sendResponse);
      return true;
    }
    if (message.type === "addCard") {
      addCard(message.entry).then(sendResponse);
      return true;
    }
  },
);
