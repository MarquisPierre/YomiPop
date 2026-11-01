"use client";

import { Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getDecks,
  getDueCards,
  getStats,
  NotLoggedInError,
  reviewCard,
  undoReview,
  type Card,
  type Rating,
  type ReviewStats as Stats,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "./ProgressBar";
import { CardImage } from "./CardImage";
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

// Lists the answer buttons in order, each with its own soft colour from the theme.
const ANSWERS: { rating: Rating; label: string; className: string }[] = [
  { rating: 1, label: "Again", className: "bg-again text-again-foreground" },
  { rating: 2, label: "Hard", className: "bg-hard text-hard-foreground" },
  { rating: 3, label: "Good", className: "bg-good text-good-foreground" },
  { rating: 4, label: "Easy", className: "bg-easy text-easy-foreground" },
];

// Shows due cards one at a time and sends each answer to the API.
export function ReviewSession() {
  const router = useRouter();
  // Reads which deck to review from the address, e.g. /review?deck=abc. None means all decks.
  const deckId = useSearchParams().get("deck") ?? undefined;
  const [deckName, setDeckName] = useState<string | null>(null);
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
    getStats(deckId)
      .then(setStats)
      .catch(() => {});
  }

  // Loads the due cards, or sends the user to sign in if they're logged out.
  function loadCards() {
    loadStats();
    getDueCards(deckId)
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

  useEffect(loadCards, [router, deckId]);

  // Looks up the deck's name to show above the card.
  useEffect(() => {
    if (!deckId) return;
    getDecks()
      .then((decks) =>
        setDeckName(decks.find((deck) => deck.id === deckId)?.name ?? null),
      )
      .catch(() => {});
  }, [deckId]);

  // Names what's being reviewed: the deck, or all decks.
  const deckLabel = deckId ? (deckName ?? "…") : "All decks";

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

  if (error) return <p className="text-destructive">{error}</p>;
  if (!cards) return <p className="text-muted-foreground">Loading…</p>;

  const undoButton = answered.length > 0 && (
    <Button variant="ghost" size="sm" onClick={undo}>
      <Undo2 aria-hidden="true" />
      Undo <span className="text-xs opacity-60">Z</span>
    </Button>
  );

  // Shows the deck being reviewed as a small red pill.
  const deckPill = (
    <span className="rounded-full bg-hanko-soft px-3 py-1 text-[13px] font-bold text-hanko-text">
      {deckLabel}
    </span>
  );

  if (!card) {
    return (
      <div className="flex w-full max-w-md flex-col items-center gap-5 text-center">
        <div className="flex w-full flex-wrap items-center gap-3">
          {deckPill}
          <ReviewStats stats={stats} />
        </div>
        {/* Shows a finished card, floating like the others. */}
        <div className="flex w-full flex-col items-center gap-3 rounded-2xl border bg-card px-8 py-12 shadow-float">
          <span
            lang="ja"
            aria-hidden="true"
            className="font-display text-6xl font-extrabold text-primary"
          >
            済
          </span>
          <p className="font-display text-2xl font-bold">All done for now</p>
          <p className="text-sm text-muted-foreground">
            Come back later for the next ones.
          </p>
        </div>
        {undoButton}
        {notice && <p className="text-sm text-destructive">{notice}</p>}
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCards}>
            Check again
          </Button>
          <Button asChild variant="ghost">
            <Link href="/decks">Back to decks</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-4">
      <div className="flex w-full flex-wrap items-center gap-3">
        {deckPill}
        <ReviewStats stats={stats} />
      </div>
      <ProgressBar
        done={answered.length}
        total={answered.length + cards.length}
      />

      {/* Stacks two cards behind the current one, tilted a little, like a real pile. */}
      <div className="relative mt-2 mb-4 w-full">
        <div
          aria-hidden="true"
          className="absolute inset-x-4 top-4 -bottom-3 rotate-[2.4deg] rounded-2xl border bg-stack-2"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-2 top-2 -bottom-1.5 -rotate-[1.6deg] rounded-2xl border bg-stack-1"
        />
        {/* Flips the card over when the answer shows; the key replays the flip each time. */}
        <div
          key={`${card.id}-${revealed}`}
          className={`relative flex min-h-[22rem] flex-col items-center gap-3 rounded-2xl border bg-card px-6 pt-6 pb-7 text-center shadow-float sm:px-10 ${
            revealed ? "motion-safe:animate-flip" : ""
          }`}
        >
          <span className="self-end text-xs text-muted-foreground">
            {cards.length} left
          </span>
          <p
            lang="ja"
            className="font-display text-6xl leading-none font-extrabold sm:text-7xl"
          >
            {card.word}
          </p>

          {revealed ? (
            <>
              <p
                lang="ja"
                className="flex items-center gap-2 text-xl text-muted-foreground"
              >
                {card.reading}
                <SpeakButton text={spokenWord} label="Read the word (W)" />
              </p>
              {card.image && <CardImage image={card.image} />}
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
            </>
          ) : (
            <Button size="lg" className="mt-auto" onClick={reveal}>
              Show answer <span className="text-xs opacity-70">Space</span>
            </Button>
          )}
        </div>
      </div>

      {revealed && (
        <div className="mt-2 grid w-full grid-cols-4 gap-2 sm:gap-3">
          {ANSWERS.map(({ rating, label, className }) => (
            <button
              key={rating}
              onClick={() => answer(rating)}
              className={`h-14 cursor-pointer rounded-full font-bold transition-transform hover:-translate-y-0.5 ${className}`}
            >
              {label} <span className="font-medium opacity-70">{rating}</span>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Space reveal · 1–4 answer · W/S listen · Z undo
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showTranslation}
            onChange={toggleTranslation}
            className="accent-primary"
          />
          Show translation
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoPlay}
            onChange={toggleAutoPlay}
            className="accent-primary"
          />
          Auto-play
        </label>
        {undoButton}
      </div>
      {notice && <p className="text-sm text-destructive">{notice}</p>}
    </div>
  );
}
