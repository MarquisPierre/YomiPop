import type { DictionaryEntry } from "./dictionary/types";

// Asks the background for the word at the start of the text.
export interface LookupMessage {
  type: "lookup";
  text: string;
}

// Describes an AI-made example sentence, as the API sends it.
export interface ExampleSentence {
  japanese: string;
  reading: string;
  english: string;
}

// Describes a picture the user can pick, as the API sends it.
export interface FoundImage {
  url: string;
  width: number;
  height: number;
  attribution: string;
  downloadLocation: string;
}

// Asks the background to save an entry as a flashcard, with the sentence it was found in and its translation.
export interface AddCardMessage {
  type: "addCard";
  entry: DictionaryEntry;
  sentence: string;
  translation: string | null;
  // Replaces the page sentence and its translation with an AI one, when chosen.
  aiSentence?: ExampleSentence;
  image?: FoundImage;
}

// Asks the background for AI sentences or pictures for a word. Fresh skips saved results.
export interface AiMessage {
  type: "aiSentences" | "aiImages";
  word: string;
  reading: string;
  meaning: string;
  fresh: boolean;
}

// Describes how an AI request went: the results, or a message to show.
export type AiResult<T> =
  { ok: true; items: T[] } | { ok: false; message: string };

// Describes a sentence's explanation, as the API sends it.
export interface Explanation {
  translation: string;
  notes: { part: string; explanation: string }[];
}

// Asks the background to translate a highlighted sentence and explain its grammar.
export interface ExplainMessage {
  type: "explain";
  sentence: string;
}

// Describes how an explanation request went.
export type ExplainResult =
  { ok: true; explanation: Explanation } | { ok: false; message: string };

// Asks the background for a link to the AI voice reading the text.
export interface SpeechMessage {
  type: "speech";
  text: string;
}

// Lists every message the background understands.
export type Message =
  LookupMessage | AddCardMessage | AiMessage | ExplainMessage | SpeechMessage;

// Lists the ways saving a card can end.
export type AddCardResult =
  "added" | "exists" | "loggedOut" | "noDeck" | "error";
