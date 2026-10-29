"use client";

import { useEffect, useState } from "react";
import { getDueCards, reviewCard, type Card, type Rating } from "@/lib/api";

// Lists the answer buttons in order.
const ANSWERS: { rating: Rating; label: string }[] = [
  { rating: 1, label: "Again" },
  { rating: 2, label: "Hard" },
  { rating: 3, label: "Good" },
  { rating: 4, label: "Easy" },
];

// Shows due cards one at a time and sends each answer to the API.
export function ReviewSession() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loads the due cards.
  function loadCards() {
    getDueCards()
      .then(setCards)
      .catch(() => setError("Couldn't reach the API. Is it running?"));
  }

  useEffect(loadCards, []);

  const card = cards?.[0];

  // Moves to the next card and sends the answer in the background.
  function answer(rating: Rating) {
    if (!card) return;
    setRevealed(false);
    setCards((current) => current?.slice(1) ?? null);
    reviewCard(card.id, rating).catch(() =>
      setError("Couldn't save that answer."),
    );
  }

  // Lets Space show the answer and 1–4 pick a rating.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === " " && !revealed) {
        event.preventDefault();
        setRevealed(true);
      }
      const rating = Number(event.key);
      if (revealed && rating >= 1 && rating <= 4) answer(rating as Rating);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (error) return <p className="text-red-500">{error}</p>;
  if (!cards) return <p className="text-zinc-500">Loading…</p>;

  if (!card) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-2xl font-semibold">All done for now</p>
        <button
          onClick={loadCards}
          className="rounded-lg border border-zinc-300 px-4 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Check again
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-zinc-200 p-8 text-center dark:border-zinc-800">
      <p className="text-sm text-zinc-500">{cards.length} left</p>

      <p lang="ja" className="text-5xl font-semibold">
        {card.word}
      </p>

      {revealed ? (
        <>
          <p lang="ja" className="text-xl text-zinc-500">
            {card.reading}
          </p>
          <ol className="list-decimal space-y-1 pl-6 text-left">
            {card.meanings.map((meaning) => (
              <li key={meaning}>{meaning}</li>
            ))}
          </ol>
          <div className="grid w-full grid-cols-4 gap-2">
            {ANSWERS.map(({ rating, label }) => (
              <button
                key={rating}
                onClick={() => answer(rating)}
                className="rounded-lg border border-zinc-300 py-2 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                {label}
                <span className="block text-xs text-zinc-500">{rating}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="rounded-lg bg-zinc-900 px-6 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Show answer <span className="text-xs opacity-60">Space</span>
        </button>
      )}
    </div>
  );
}
