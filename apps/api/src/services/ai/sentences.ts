import { askGemini } from "./gemini.js";

// Describes one example sentence, as the build plan asks: Japanese, reading and English.
export interface ExampleSentence {
  japanese: string;
  reading: string;
  english: string;
}

// Describes the answer Gemini must give, in its schema format.
const SENTENCES_SCHEMA = {
  type: "OBJECT",
  properties: {
    sentences: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          japanese: { type: "STRING" },
          reading: { type: "STRING" },
          english: { type: "STRING" },
        },
        required: ["japanese", "reading", "english"],
      },
    },
  },
  required: ["sentences"],
};

// Asks for 3 short sentences that use the word, at an easy level.
export async function writeSentences(
  word: string,
  reading: string,
  meaning: string,
): Promise<ExampleSentence[]> {
  const prompt = [
    "You write example sentences for a Japanese learner's flashcards.",
    `Write 3 short, natural Japanese sentences that each use the word ${word} (read ${reading}), meaning "${meaning}".`,
    "Keep them simple, around JLPT N4 level, and under 25 characters each.",
    "For each one, give the sentence, its reading in hiragana, and an English translation.",
  ].join("\n");

  const { sentences } = await askGemini<{ sentences: ExampleSentence[] }>(
    prompt,
    SENTENCES_SCHEMA,
  );
  // Keeps only complete sentences, in case the AI leaves something out.
  return sentences
    .filter((s) => s.japanese && s.reading && s.english)
    .slice(0, 3);
}
