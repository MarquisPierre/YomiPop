import type { DictionaryEntry } from "./dictionary/types";

// Asks the background for the word at the start of the text.
export interface LookupMessage {
  type: "lookup";
  text: string;
}

// Asks the background to save an entry as a flashcard.
export interface AddCardMessage {
  type: "addCard";
  entry: DictionaryEntry;
}

// Lists every message the background understands.
export type Message = LookupMessage | AddCardMessage;

// Lists the ways saving a card can end.
export type AddCardResult = "added" | "exists" | "error";
