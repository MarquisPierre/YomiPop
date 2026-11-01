"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  deleteCard,
  getCards,
  NotLoggedInError,
  updateCard,
  type Card,
} from "@/lib/api";

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

// Checks whether the card's word, reading, meanings or sentence contain the search text.
function matchesSearch(card: Card, search: string): boolean {
  const text = search.trim().toLowerCase();
  if (!text) return true;
  return [card.word, card.reading, ...card.meanings, card.sentence ?? ""].some(
    (value) => value.toLowerCase().includes(text),
  );
}

// Lists the user's cards with search, edit and delete.
export function CardList() {
  const router = useRouter();
  const [cards, setCards] = useState<Card[] | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loads the cards, or sends the user to sign in if they're logged out.
  useEffect(() => {
    getCards()
      .then(setCards)
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

  const shown = cards.filter((card) => matchesSearch(card, search));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Cards ({cards.length})</h1>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search…"
          className="w-56 rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
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
            <li key={card.id} className="flex items-center gap-4 py-3">
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
              </span>
              <span className="w-20 shrink-0 text-sm text-zinc-500">
                {describeDue(card.dueAt)}
              </span>
              <button
                onClick={() => setEditingId(card.id)}
                className={BUTTON_CLASS}
              >
                Edit
              </button>
              <button onClick={() => remove(card)} className={BUTTON_CLASS}>
                Delete
              </button>
            </li>
          ),
        )}
      </ul>

      {cards.length > 0 && shown.length === 0 && (
        <p className="text-zinc-500">No cards match “{search}”.</p>
      )}
    </div>
  );
}
