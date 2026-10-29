import type { LookupMessage } from "../messages";
import { findWord } from "./findWord";
import { loadDictionary } from "./loadDictionary";

// Loads the dictionary, logging any failure.
function load(): void {
  loadDictionary().catch((error) =>
    console.error("Dictionary load failed", error),
  );
}

chrome.runtime.onInstalled.addListener(load);
chrome.runtime.onStartup.addListener(load);

// Answers lookups from the content script.
chrome.runtime.onMessage.addListener(
  (message: LookupMessage, _sender, sendResponse) => {
    if (message.type !== "lookup") return;
    findWord(message.text).then(sendResponse);
    return true;
  },
);
