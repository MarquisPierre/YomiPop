import type { Message } from "../messages";
import { addCard } from "./addCard";
import { findWord } from "./findWord";
import { injectIntoOpenTabs } from "./injectIntoOpenTabs";
import { loadDictionary } from "./loadDictionary";

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

// Answers lookups and save requests from the content script.
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === "lookup") {
      findWord(message.text).then(sendResponse);
      return true;
    }
    if (message.type === "addCard") {
      addCard(message.entry).then(sendResponse);
      return true;
    }
  },
);
