"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  deleteCard,
  getCards,
  getDecks,
  NotLoggedInError,
  updateCard,
  type Card,
  type Deck,
} from "@/lib/api";
import { CardPreview } from "./CardPreview";

// Styles the text boxes used while editing.
const INPUT_CLASS =
  "w-full rounded-md border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700";

// Styles the small buttons on each row.
const BUTTON_CLASS =
  "rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-current dark:hover:bg-zinc-900";

// Describes when a card is due, like "due now", "in 10 min" or "in 4 days".
function describeDue(dueAt: string): string {
  const minutes = (new Date(dueAt).getTime() - Date.now()) / 60_000;
  if (minutes <= 0) return "due now";
  if (minutes < 60) return `in ${Math.ceil(minutes)} min`;
  if (minutes < 60 * 24) return `in ${Math.round(minutes / 60)} h`;
  return `in ${Math.round(minutes / (60 * 24))} days`;
}

// Checks whether the card's word, reading, meanings, sentence or translation contain the search text.
function matchesSearch(card: Card, search: string): boolean {
  const text = search.trim().toLowerCase();
  if (!text) return true;
  return [
    card.word,
    card.reading,
    ...card.meanings,
    card.sentence ?? "",
    card.translation ?? "",
  ].some((value) => value.toLowerCase().includes(text));
}

// Lists the user's cards with search, edit and delete.
export function CardList() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  // Holds the deck being shown, or "all".
  // Reads the deck to show from the address, e.g. /cards?deck=abc, or shows all.
  const searchParams = useSearchParams();
  const [deckFilter, setDeckFilter] = useState(
    () => searchParams.get("deck") ?? "all",
  );
  // Holds the card being previewed, if any.
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Shows another deck and puts it in the address, so back and bookmarks work.
  function chooseDeck(deck: string) {
    setDeckFilter(deck);
    router.replace(deck === "all" ? "/cards" : `/cards?deck=${deck}`, {
      scroll: false,
    });
  }

  // Loads the cards and decks, or sends the user to sign in if they're logged out.
  useEffect(() => {
    Promise.all([getCards(), getDecks()])
      .then(([cardList, deckList]) => {
        setCards(cardList);
        setDecks(deckList);
      })
      .catch((error) =>
        error instanceof NotLoggedInError
          ? router.replace("/sign-in")
          : setError("Couldn't reach the API. Is it running?"),
      );
  }, [router]);

  // Deletes the card after the user confirms.
  async function remove(card: Card) {
    if (!confirm(`Delete ${card.word}?`)) return;
    try {
      await deleteCard(card.id);
      setCards((current) => current?.filter((c) => c.id !== card.id) ?? null);
    } catch {
      setError(`Couldn't delete ${card.word}.`);
    }
  }

  // Saves the edit form, with one meaning per line.
  async function save(event: FormEvent<HTMLFormElement>, card: Card) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const meanings = String(form.get("meanings"))
      .split("\n")
      .map((meaning) => meaning.trim())
      .filter(Boolean);
    if (meanings.length === 0) {
      setError("A card needs at least one meaning.");
      return;
    }

    try {
      const updated = await updateCard(card.id, {
        word: String(form.get("word")).trim(),
        reading: String(form.get("reading")).trim(),
        meanings,
        sentence: String(form.get("sentence")).trim() || null,
        translation: String(form.get("translation")).trim() || null,
        deckId: String(form.get("deckId")),
      });
      setCards(
        (current) =>
          current?.map((c) => (c.id === updated.id ? updated : c)) ?? null,
      );
      setEditingId(null);
      setError(null);
    } catch {
      setError(`Couldn't save ${card.word}.`);
    }
  }

  if (!cards) {
    return <p className="text-zinc-500">{error ?? "Loading…"}</p>;
  }

  // Shows the cards in the chosen deck that match the search.
  const shown = cards.filter(
    (card) =>
      (deckFilter === "all" || card.deckId === deckFilter) &&
      matchesSearch(card, search),
  );
  // Looks up a deck's name for showing on each card.
  const deckName = (id: string) =>
    decks.find((deck) => deck.id === id)?.name ?? "";
  // Finds the card being previewed. It's gone if it was deleted meanwhile.
  const previewCard = cards.find((card) => card.id === previewId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Cards ({shown.length})</h1>
        <div className="flex gap-2">
          <select
            value={deckFilter}
            onChange={(event) => chooseDeck(event.target.value)}
            aria-label="Deck"
            className="rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          >
            <option value="all">All decks</option>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search…"
            className="w-56 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {cards.length === 0 && (
        <p className="text-zinc-500">
          No cards yet. Hover a word with the extension and press A to save it.
        </p>
      )}

      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {shown.map((card) =>
          card.id === editingId ? (
            <li key={card.id} className="py-3">
              <form
                onSubmit={(event) => save(event, card)}
                className="grid gap-2 sm:grid-cols-[8rem_8rem_1fr]"
              >
                <input
                  name="word"
                  defaultValue={card.word}
                  required
                  lang="ja"
                  className={INPUT_CLASS}
                />
                <input
                  name="reading"
                  defaultValue={card.reading}
                  lang="ja"
                  className={INPUT_CLASS}
                />
                <textarea
                  name="meanings"
                  defaultValue={card.meanings.join("\n")}
                  rows={Math.max(2, card.meanings.length)}
                  className={INPUT_CLASS}
                />
                <input
                  name="sentence"
                  defaultValue={card.sentence ?? ""}
                  placeholder="Example sentence"
                  maxLength={300}
                  lang="ja"
                  className={`${INPUT_CLASS} sm:col-span-3`}
                />
                <input
                  name="translation"
                  defaultValue={card.translation ?? ""}
                  placeholder="Translation"
                  maxLength={500}
                  className={`${INPUT_CLASS} sm:col-span-3`}
                />
                <label className="flex items-center gap-2 text-sm text-zinc-500 sm:col-span-3">
                  Deck
                  <select
                    name="deckId"
                    defaultValue={card.deckId}
                    className={INPUT_CLASS}
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-2 sm:col-span-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className={BUTTON_CLASS}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Save
                  </button>
                </div>
              </form>
            </li>
          ) : (
            <li
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => setPreviewId(card.id)}
              onKeyDown={(event) =>
                event.key === "Enter" && setPreviewId(card.id)
              }
              className="flex cursor-pointer items-center gap-4 rounded-md py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
            >
              <span lang="ja" className="w-24 shrink-0 text-lg font-semibold">
                {card.word}
              </span>
              <span lang="ja" className="w-24 shrink-0 text-zinc-500">
                {card.reading}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">
                  {card.meanings.join("; ")}
                </span>
                {card.sentence && (
                  <span
                    lang="ja"
                    className="block truncate text-sm text-zinc-500"
                  >
                    {card.sentence}
                  </span>
                )}
                {card.translation && (
                  <span className="block truncate text-sm text-zinc-500">
                    {card.translation}
                  </span>
                )}
              </span>
              {deckFilter === "all" && (
                <span className="w-24 shrink-0 truncate text-sm text-zinc-500">
                  {deckName(card.deckId)}
                </span>
              )}
              <span className="w-20 shrink-0 text-sm text-zinc-500">
                {describeDue(card.dueAt)}
              </span>
              <button
                onClick={(event) => {
                  // Keeps the click from also opening the preview.
                  event.stopPropagation();
                  setEditingId(card.id);
                }}
                className={BUTTON_CLASS}
              >
                Edit
              </button>
              <button
                onClick={(event) => {
                  // Keeps the click from also opening the preview.
                  event.stopPropagation();
                  remove(card);
                }}
                className={BUTTON_CLASS}
              >
                Delete
              </button>
            </li>
          ),
        )}
      </ul>

      {cards.length > 0 && shown.length === 0 && (
        <p className="text-zinc-500">No cards match “{search}”.</p>
      )}

      {previewCard && (
        <CardPreview
          card={previewCard}
          deckName={deckName(previewCard.deckId)}
          due={describeDue(previewCard.dueAt)}
          onEdit={() => {
            // Swaps the preview for that card's edit form.
            setPreviewId(null);
            setEditingId(previewCard.id);
          }}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}
