"use client";

import { useEffect, useState } from "react";
import {
  ApiError,
  getAiSentences,
  type Card,
  type ExampleSentence,
} from "@/lib/api";

// Styles the picker's buttons.
const BUTTON_CLASS =
  "rounded-md px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-current dark:hover:bg-zinc-900";

// Gets AI example sentences for a card, lets the user flip through them, and hands back the one picked.
export function SentencePicker({
  card,
  onPicked,
  onCancel,
}: {
  card: Card;
  onPicked: (sentence: ExampleSentence) => void;
  onCancel: () => void;
}) {
  const [sentences, setSentences] = useState<ExampleSentence[]>([]);
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState<string | null>("Writing sentences…");

  // Shows the sentences written, or why there are none.
  function show(found: ExampleSentence[]) {
    setSentences(found);
    setIndex(0);
    setNote(found.length > 0 ? null : "No sentences came back.");
  }

  // Shows why it failed, like the daily AI limit.
  function fail(error: unknown) {
    setNote(
      error instanceof ApiError ? error.message : "Couldn't write sentences.",
    );
  }

  // Gets sentences when the picker opens, reusing saved ones when it can.
  useEffect(() => {
    getAiSentences(card, false).then(show, fail);
  }, [card]);

  // Shows the next sentence, or asks for new ones after the last.
  function next() {
    if (index + 1 < sentences.length) {
      setIndex(index + 1);
      return;
    }
    setNote("Writing sentences…");
    getAiSentences(card, true).then(show, fail);
  }

  const sentence = sentences[index];
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      {sentence && !note && (
        <>
          <p lang="ja">{sentence.japanese}</p>
          <p className="text-sm text-zinc-500">{sentence.english}</p>
        </>
      )}
      {note && <p className="text-sm text-zinc-500">{note}</p>}
      <div className="flex gap-1">
        {sentences.length > 0 && (
          <button type="button" onClick={next} className={BUTTON_CLASS}>
            🔄 Another
          </button>
        )}
        {sentence && !note && (
          <button
            type="button"
            onClick={() => onPicked(sentence)}
            className={BUTTON_CLASS}
          >
            Use this
          </button>
        )}
        <button type="button" onClick={onCancel} className={BUTTON_CLASS}>
          Cancel
        </button>
      </div>
    </div>
  );
}
