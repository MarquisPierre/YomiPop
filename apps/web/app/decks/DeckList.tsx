"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import {
  ApiError,
  createDeck,
  deleteDeck,
  getCards,
  getDecks,
  getStats,
  NotLoggedInError,
  renameDeck,
  type Deck,
} from "@/lib/api";

// Styles the small buttons on each row.
const BUTTON_CLASS =
  "rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-current dark:hover:bg-zinc-900";

// Styles the text boxes for deck names.
const INPUT_CLASS =
  "rounded-lg border border-zinc-300 bg-transparent px-3 py-1 dark:border-zinc-700";

// Lists the user's decks with review links, and lets them make, rename and delete decks.
export function DeckList() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[] | null>(null);
  const [allDue, setAllDue] = useState(0);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loads the decks and the all-decks total, or sends the user to sign in if they're logged out.
  function load() {
    Promise.all([getDecks(), getStats()])
      .then(([list, stats]) => {
        setDecks(list);
        setAllDue(stats.dueNow);
      })
      .catch((error) =>
        error instanceof NotLoggedInError
          ? router.replace("/sign-in")
          : setError("Couldn't reach the API. Is it running?"),
      );
  }

  useEffect(load, [router]);

  // Runs a deck change, then reloads the list, or shows the API's reason if it said no.
  async function change(action: () => Promise<void>) {
    try {
      await action();
      setError(null);
      setRenamingId(null);
      load();
    } catch (error) {
      setError(
        error instanceof ApiError ? error.message : "Something went wrong.",
      );
    }
  }

  // Makes a deck from the form and clears the box.
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name"));
    change(async () => {
      await createDeck(name);
      form.reset();
    });
  }

  // Renames a deck from its inline form.
  function rename(event: FormEvent<HTMLFormElement>, deck: Deck) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name"));
    change(() => renameDeck(deck.id, name));
  }

  // Deletes a deck after warning how many cards go with it.
  async function remove(deck: Deck) {
    const cards = (await getCards()).filter((card) => card.deckId === deck.id);
    const warning = `Delete "${deck.name}" and its ${cards.length} card${cards.length === 1 ? "" : "s"}? This can't be undone.`;
    if (confirm(warning)) change(() => deleteDeck(deck.id));
  }

  if (!decks) return <p className="text-zinc-500">{error ?? "Loading…"}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Decks</h1>
        <form onSubmit={create} className="flex gap-2">
          <input
            name="name"
            placeholder="New deck name"
            required
            maxLength={50}
            className={INPUT_CLASS}
          />
          <button type="submit" className={BUTTON_CLASS}>
            + New deck
          </button>
        </form>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {decks.map((deck) => (
          <li key={deck.id} className="flex items-center gap-4 py-3">
            {deck.id === renamingId ? (
              // Shows a box to type the new name in, in place of the deck's name.
              <form
                onSubmit={(event) => rename(event, deck)}
                className="flex flex-1 gap-2"
              >
                <input
                  name="name"
                  defaultValue={deck.name}
                  required
                  maxLength={50}
                  autoFocus
                  className={`${INPUT_CLASS} flex-1`}
                />
                <button type="submit" className={BUTTON_CLASS}>
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setRenamingId(null)}
                  className={BUTTON_CLASS}
                >
                  Cancel
                </button>
              </form>
            ) : (
              <>
                <Link
                  href={`/cards?deck=${deck.id}`}
                  className="flex-1 font-medium hover:underline"
                >
                  {deck.name}
                </Link>
                <span className="text-sm text-zinc-500">
                  {deck.due} due · {deck.new} new
                </span>
                <Link
                  href={`/review?deck=${deck.id}`}
                  className="rounded-lg bg-zinc-900 px-3 py-1 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
                >
                  Review
                </Link>
                <button
                  onClick={() => setRenamingId(deck.id)}
                  className={BUTTON_CLASS}
                >
                  Rename
                </button>
                <button onClick={() => remove(deck)} className={BUTTON_CLASS}>
                  Delete
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Reviews every deck together. */}
      <div className="flex items-center gap-4 border-t border-zinc-300 pt-3 dark:border-zinc-700">
        <span className="flex-1 font-medium">All decks</span>
        <span className="text-sm text-zinc-500">{allDue} to review</span>
        <Link
          href="/review"
          className="rounded-lg border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Review all
        </Link>
      </div>
    </div>
  );
}
