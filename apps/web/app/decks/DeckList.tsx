"use client";

import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

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

  if (!decks) {
    return <p className="text-muted-foreground">{error ?? "Loading…"}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-3xl font-extrabold">Decks</h1>
        <span className="text-sm text-muted-foreground">
          <b className="text-hanko-text">{allDue} to review</b> across all decks
        </span>
        <form
          onSubmit={create}
          className="flex w-full gap-2 sm:ml-auto sm:w-auto"
        >
          <Input
            name="name"
            placeholder="New deck name"
            aria-label="New deck name"
            required
            maxLength={50}
            className="sm:w-52"
          />
          <Button type="submit">
            <Plus aria-hidden="true" />
            New deck
          </Button>
        </form>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Shows each deck as a floating tile that lifts a little on hover. */}
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {decks.map((deck) => (
          <li
            key={deck.id}
            className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-float transition hover:-translate-y-1 hover:shadow-float-lifted"
          >
            {deck.id === renamingId ? (
              // Shows a box to type the new name in, in place of the deck's name.
              <form
                onSubmit={(event) => rename(event, deck)}
                className="flex flex-col gap-3"
              >
                <Input
                  name="name"
                  defaultValue={deck.name}
                  aria-label="Deck name"
                  required
                  maxLength={50}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setRenamingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  {/* Opens the deck's cards on the Cards page. */}
                  <Link
                    href={`/cards?deck=${deck.id}`}
                    className="truncate font-display text-xl font-bold hover:text-primary"
                  >
                    {deck.name}
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Options for ${deck.name}`}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setRenamingId(deck.id)}>
                        <Pencil />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => remove(deck)}
                      >
                        <Trash2 />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-wrap gap-2 text-[13px] font-bold">
                  {deck.due === 0 && deck.new === 0 ? (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                      All caught up
                    </span>
                  ) : (
                    <>
                      <span className="rounded-full bg-again px-2.5 py-1 text-again-foreground">
                        {deck.due} due
                      </span>
                      <span className="rounded-full bg-easy px-2.5 py-1 text-easy-foreground">
                        {deck.new} new
                      </span>
                    </>
                  )}
                </div>
                {deck.due === 0 && deck.new === 0 ? (
                  <Button asChild variant="outline" className="mt-auto">
                    <Link href={`/cards?deck=${deck.id}`}>Browse cards</Link>
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="mt-auto bg-foreground text-background hover:bg-foreground/90"
                  >
                    <Link href={`/review?deck=${deck.id}`}>Review</Link>
                  </Button>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {/* Reviews every deck together. */}
      <Button asChild size="lg" className="self-center shadow-float">
        <Link href="/review">Review all decks · {allDue}</Link>
      </Button>
    </div>
  );
}
