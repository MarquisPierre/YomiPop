"use client";

import { useEffect } from "react";
import type { Card } from "@/lib/api";
import { Sentence } from "../review/Sentence";
import { SpeakButton } from "../review/speak";

// Styles the buttons at the bottom of the preview.
const BUTTON_CLASS =
  "rounded-md px-3 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-current dark:hover:bg-zinc-900";

// Shows a card the way it looks after revealing it in review, on top of the page.
// The Cards page works out the deck name and due time, since it already has them.
export function CardPreview({
  card,
  deckName,
  due,
  onEdit,
  onClose,
}: {
  card: Card;
  deckName: string;
  due: string;
  onEdit: () => void;
  onClose: () => void;
}) {
  // Closes the preview on Escape.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    // Dims the page behind the preview. Clicking the dimmed part closes it.
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      {/* Keeps clicks inside the preview from closing it. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview of ${card.word}`}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-full w-full max-w-md flex-col items-center gap-4 overflow-y-auto rounded-2xl bg-white p-8 text-center dark:bg-zinc-950"
      >
        <p lang="ja" className="text-5xl font-semibold">
          {card.word}
        </p>

        {/* Shows the reading with a button that reads it aloud. */}
        <p lang="ja" className="text-xl text-zinc-500">
          {card.reading}
          <span className="ml-2">
            <SpeakButton
              text={card.reading || card.word}
              label="Read the word"
            />
          </span>
        </p>

        {/* Shows the sentence with the word in bold, and its translation. */}
        {card.sentence && (
          <Sentence
            sentence={card.sentence}
            word={card.word}
            translation={card.translation}
          />
        )}

        <ol className="list-decimal space-y-1 pl-6 text-left">
          {card.meanings.map((meaning) => (
            <li key={meaning}>{meaning}</li>
          ))}
        </ol>

        {/* Shows the card's deck, when it's due and how often it's been reviewed. */}
        <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-4 text-sm text-zinc-500 dark:border-zinc-800">
          <span>
            {deckName} · {due} · reviewed {card.reps}×
          </span>
          <span className="flex gap-1">
            <button onClick={onEdit} className={BUTTON_CLASS}>
              Edit
            </button>
            <button onClick={onClose} className={BUTTON_CLASS}>
              Close
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
