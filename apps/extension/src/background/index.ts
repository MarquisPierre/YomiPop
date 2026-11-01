import type { WordMatch } from "../dictionary/types";
import type { Message } from "../messages";
import { COOKIE_NAMES } from "../session";
import { addCard } from "./addCard";
import { askAi } from "./askAi";
import { BADGE_ALARM, startDueBadge, updateDueBadge } from "./dueBadge";
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
  startDueBadge();
});
chrome.runtime.onStartup.addListener(() => {
  load();
  startDueBadge();
});

// Refreshes the due count on the toolbar icon on schedule, and when the user logs in or out.
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BADGE_ALARM) updateDueBadge();
});
chrome.cookies.onChanged.addListener(({ cookie }) => {
  if (COOKIE_NAMES.includes(cookie.name)) updateDueBadge();
});

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
      addCard(
        message.entry,
        message.sentence,
        message.translation,
        message.aiSentence,
        message.image,
      ).then((result) => {
        sendResponse(result);
        if (result === "added") updateDueBadge();
      });
      return true;
    }
    if (message.type === "aiSentences" || message.type === "aiImages") {
      askAi(message).then(sendResponse);
      return true;
    }
  },
);
