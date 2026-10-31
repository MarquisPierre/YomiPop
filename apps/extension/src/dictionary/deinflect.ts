import type { DictionaryEntry } from "./types";
import { RULES } from "./rules";

// Lists the word types a conjugation can lead to. All but "masu" and "te" are JMdict codes.
export type WordType =
  "v1" | "v5" | "vk" | "vs-i" | "vs" | "adj-i" | "masu" | "te";

// Describes one way to undo a conjugation.
export interface Rule {
  name: string;
  from: string;
  to: string;
  toType: WordType;
  fromType?: WordType;
}

// Describes a possible dictionary form of the text.
export interface Deinflection {
  word: string;
  type?: WordType;
  reasons: string[];
}

// Lists every dictionary form the text could come from, starting with the text itself.
export function deinflect(text: string): Deinflection[] {
  const results: Deinflection[] = [{ word: text, reasons: [] }];

  for (let i = 0; i < results.length; i++) {
    const current = results[i]!;
    for (const rule of RULES) {
      if (current.type && rule.fromType !== current.type) continue;
      if (!current.word.endsWith(rule.from)) continue;

      const word = current.word.slice(0, -rule.from.length) + rule.to;
      if (word)
        results.push({
          word,
          type: rule.toType,
          reasons: [rule.name, ...current.reasons],
        });
    }
  }
  return results;
}

// Checks whether a JMdict part of speech belongs to the word type.
function matchesType(partOfSpeech: string, type: WordType): boolean {
  if (type === "v5") return partOfSpeech.startsWith("v5");
  if (type === "v1")
    return partOfSpeech.startsWith("v1") || partOfSpeech === "vk";
  return partOfSpeech === type;
}

// Checks whether the entry is the kind of word the deinflection needs.
export function fitsType(entry: DictionaryEntry, type?: WordType): boolean {
  if (!type) return true;
  return entry.senses.some((sense) =>
    sense.partsOfSpeech.some((partOfSpeech) => matchesType(partOfSpeech, type)),
  );
}
