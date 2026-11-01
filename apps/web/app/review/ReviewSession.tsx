"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getDueCards,
  getStats,
  NotLoggedInError,
  reviewCard,
  undoReview,
  type Card,
  type Rating,
  type ReviewStats as Stats,
} from "@/lib/api";
import { ProgressBar } from "./ProgressBar";
import { ReviewStats } from "./ReviewStats";
import { Sentence } from "./Sentence";
import { SpeakButton, speak } from "./speak";

// Names the browser storage slots that remember the review page's checkboxes.
const TRANSLATION_KEY = "yomipop.showTranslation";
const AUTO_PLAY_KEY = "yomipop.autoPlay";

// Reads a remembered checkbox. Storage can be blocked, so failures count as the default.
function loadChoice(key: string, fallback: boolean): boolean {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback : saved === "on";
  } catch {
    return fallback;
  }
}

// Remembers a checkbox.
function saveChoice(key: string, on: boolean): void {
  try {
    localStorage.setItem(key, on ? "on" : "off");
  } catch {
    // Storage is blocked, so the choice lasts until the page closes.
  }
}

// Lists the answer buttons in order.
const ANSWERS: { rating: Rating; label: string }[] = [
  { rating: 1, label: "Again" },
  { rating: 2, label: "Hard" },
  { rating: 3, label: "Good" },
  { rating: 4, label: "Easy" },
];

// Shows due cards one at a time and sends each answer to the API.
export function ReviewSession() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  // Holds the cards answered this session, newest last, so answers can be undone.
  const [answered, setAnswered] = useState<Card[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  // Tracks the answer still being saved, so an undo waits for it.
  const savingAnswer = useRef<Promise<unknown>>(Promise.resolve());
  const [showTranslation, setShowTranslation] = useState(() =>
    loadChoice(TRANSLATION_KEY, true),
  );
  const [autoPlay, setAutoPlay] = useState(() =>
    loadChoice(AUTO_PLAY_KEY, false),
  );

  // Turns translations on or off and remembers the choice.
  function toggleTranslation() {
    saveChoice(TRANSLATION_KEY, !showTranslation);
    setShowTranslation(!showTranslation);
  }

  // Turns reading the word aloud on reveal on or off and remembers the choice.
  function toggleAutoPlay() {
    saveChoice(AUTO_PLAY_KEY, !autoPlay);
    setAutoPlay(!autoPlay);
  }

  // Refreshes the numbers above the review. They're extra, so failures are ignored.
  function loadStats() {
    getStats()
      .then(setStats)
      .catch(() => {});
  }

  // Loads the due cards, or sends the user to sign in if they're logged out.
  function loadCards() {
    loadStats();
    getDueCards()
      .then((due) => {
        // Starts a new session, so earlier answers can't be undone from here.
        setAnswered([]);
        setCards(due);
      })
      .catch((error) =>
        error instanceof NotLoggedInError
          ? router.replace("/sign-in")
          : setError("Couldn't reach the API. Is it running?"),
      );
  }

  useEffect(loadCards, [router]);

  const card = cards?.[0];
  // Reads the kana reading when there is one, since voices sometimes misread kanji.
  const spokenWord = card ? card.reading || card.word : "";

  // Shows the answer, reading the word aloud if auto-play is on.
  function reveal() {
    setRevealed(true);
    if (autoPlay) speak(spokenWord);
  }

  // Moves to the next card and sends the answer in the background.
  function answer(rating: Rating) {
    if (!card) return;
    setRevealed(false);
    setNotice(null);
    setCards((current) => current?.slice(1) ?? null);
    setAnswered((current) => [...current, card]);
    savingAnswer.current = reviewCard(card.id, rating)
      .then(loadStats)
      .catch(() => setError("Couldn't save that answer."));
  }

  // Takes back the last answer and shows that card again.
  async function undo() {
    const last = answered.at(-1);
    if (!last) return;
    setAnswered((current) => current.slice(0, -1));
    setNotice(null);
    try {
      await savingAnswer.current;
      const restored = await undoReview(last.id);
      setRevealed(false);
      setCards((current) => [restored, ...(current ?? [])]);
      loadStats();
    } catch {
      setAnswered((current) => [...current, last]);
      setNotice("Couldn't undo that answer.");
    }
  }

  // Lets Space show the answer, 1–4 pick a rating, Z undo, and W or S read the word or sentence.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === " " && !revealed) {
        event.preventDefault();
        reveal();
      }
      const rating = Number(event.key);
      if (revealed && rating >= 1 && rating <= 4) answer(rating as Rating);

      const key = event.key.toLowerCase();
      if (key === "z") undo();
      if (revealed && key === "w") speak(spokenWord);
      if (revealed && key === "s" && card?.sentence) {
        speak(card.sentence);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (error) return <p className="text-red-500">{error}</p>;
  if (!cards) return <p className="text-zinc-500">Loading…</p>;

  const undoButton = answered.length > 0 && (
    <button
      onClick={undo}
      className="text-sm text-zinc-500 underline hover:text-current"
    >
      ↶ Undo <span className="text-xs opacity-60">Z</span>
    </button>
  );

  if (!card) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <ReviewStats stats={stats} />
        <p className="text-2xl font-semibold">All done for now</p>
        {undoButton}
        {notice && <p className="text-sm text-red-500">{notice}</p>}
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
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <ReviewStats stats={stats} />
        <label className="flex items-center gap-2 text-sm text-zinc-500">
          <input
            type="checkbox"
            checked={showTranslation}
            onChange={toggleTranslation}
          />
          Show translation
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-500">
          <input type="checkbox" checked={autoPlay} onChange={toggleAutoPlay} />
          Auto-play
        </label>
      </div>
      <ProgressBar
        done={answered.length}
        total={answered.length + cards.length}
      />
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-zinc-200 p-8 text-center dark:border-zinc-800">
        <p className="text-sm text-zinc-500">{cards.length} left</p>

        <p lang="ja" className="text-5xl font-semibold">
          {card.word}
        </p>

        {revealed ? (
          <>
            <p lang="ja" className="text-xl text-zinc-500">
              {card.reading}
              <span className="ml-2">
                <SpeakButton text={spokenWord} label="Read the word (W)" />
              </span>
            </p>
            {card.sentence && (
              <Sentence
                sentence={card.sentence}
                word={card.word}
                translation={showTranslation ? card.translation : null}
              />
            )}
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
            onClick={reveal}
            className="rounded-lg bg-zinc-900 px-6 py-2 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Show answer <span className="text-xs opacity-60">Space</span>
          </button>
        )}
      </div>
      {undoButton}
      {notice && <p className="text-sm text-red-500">{notice}</p>}
    </div>
  );
}
