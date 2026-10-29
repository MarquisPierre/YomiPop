// Asks the background for the word at the start of the text.
export interface LookupMessage {
  type: "lookup";
  text: string;
}
