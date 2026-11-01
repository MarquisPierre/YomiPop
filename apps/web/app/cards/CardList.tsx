"use client";

import { ImageIcon, Pencil, Search, Sparkles, Trash2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  deleteCard,
  getCards,
  getDecks,
  NotLoggedInError,
  updateCard,
  type Card,
  type Deck,
  type ChosenImage,
  uploadPicture,
  ApiError,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { UploadButton } from "../UploadButton";
import { Input } from "@/components/ui/input";
import { CardImage } from "../review/CardImage";
import { CardPreview } from "./CardPreview";
import { PicturePicker } from "./PicturePicker";
import { SentencePicker } from "./SentencePicker";

// Styles the text boxes and dropdowns used while editing, matching the theme's inputs.
const INPUT_CLASS =
  "w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

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
  // Holds the edit form's open picker, and a new picture chosen but not yet saved.
  const [editPicker, setEditPicker] = useState<"sentence" | "picture" | null>(
    null,
  );
  const [newImage, setNewImage] = useState<ChosenImage | null>(null);
  // Points at the sentence and translation boxes, so an AI sentence can fill them.
  const sentenceInput = useRef<HTMLInputElement>(null);
  const translationInput = useRef<HTMLInputElement>(null);

  // Opens a card's edit form with no picker open and no new picture.
  function startEditing(id: string) {
    setEditingId(id);
    setEditPicker(null);
    setNewImage(null);
  }

  // Closes the edit form, throwing away anything chosen but not saved.
  function stopEditing() {
    setEditingId(null);
    setEditPicker(null);
    setNewImage(null);
  }

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
        // Saves a newly chosen picture, or takes the picture off when that box is ticked.
        ...(newImage ? { image: newImage } : {}),
        ...(form.get("removeImage") === "on" ? { imageId: null } : {}),
      });
      setCards(
        (current) =>
          current?.map((c) => (c.id === updated.id ? updated : c)) ?? null,
      );
      stopEditing();
      setError(null);
    } catch {
      setError(`Couldn't save ${card.word}.`);
    }
  }

  if (!cards) {
    return <p className="text-muted-foreground">{error ?? "Loading…"}</p>;
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <h1 className="font-display text-3xl font-extrabold">
          Cards{" "}
          <span className="text-xl font-bold text-muted-foreground">
            {shown.length}
          </span>
        </h1>
        <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
          <select
            value={deckFilter}
            onChange={(event) => chooseDeck(event.target.value)}
            aria-label="Deck"
            className="h-11 cursor-pointer rounded-xl border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="all">All decks</option>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
          <div className="relative flex-1 sm:w-60 sm:flex-none">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search…"
              aria-label="Search cards"
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {cards.length === 0 && (
        <p className="text-muted-foreground">
          No cards yet. Hover a word with the extension and press A to save it.
        </p>
      )}

      {/* Shows each card as a small floating card that lifts a little on hover. */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((card) =>
          card.id === editingId ? (
            <li
              key={card.id}
              className="rounded-2xl border bg-card p-5 shadow-float-lifted sm:col-span-2 lg:col-span-3"
            >
              <form
                onSubmit={(event) => save(event, card)}
                className="grid gap-3 sm:grid-cols-[10rem_10rem_1fr]"
              >
                <input
                  name="word"
                  defaultValue={card.word}
                  required
                  lang="ja"
                  aria-label="Word"
                  className={INPUT_CLASS}
                />
                <input
                  name="reading"
                  defaultValue={card.reading}
                  lang="ja"
                  aria-label="Reading"
                  className={INPUT_CLASS}
                />
                <textarea
                  name="meanings"
                  defaultValue={card.meanings.join("\n")}
                  rows={Math.max(2, card.meanings.length)}
                  aria-label="Meanings, one per line"
                  className={INPUT_CLASS}
                />
                <input
                  ref={sentenceInput}
                  name="sentence"
                  defaultValue={card.sentence ?? ""}
                  placeholder="Example sentence"
                  maxLength={300}
                  lang="ja"
                  className={`${INPUT_CLASS} sm:col-span-3`}
                />
                <input
                  ref={translationInput}
                  name="translation"
                  defaultValue={card.translation ?? ""}
                  placeholder="Translation"
                  maxLength={500}
                  className={`${INPUT_CLASS} sm:col-span-3`}
                />
                <div className="sm:col-span-3">
                  {editPicker === "sentence" ? (
                    <SentencePicker
                      card={card}
                      onPicked={(sentence) => {
                        // Fills the boxes, so the sentence can still be tweaked before saving.
                        if (sentenceInput.current) {
                          sentenceInput.current.value = sentence.japanese;
                        }
                        if (translationInput.current) {
                          translationInput.current.value = sentence.english;
                        }
                        setEditPicker(null);
                      }}
                      onCancel={() => setEditPicker(null)}
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditPicker("sentence")}
                    >
                      <Sparkles aria-hidden="true" />
                      AI sentence
                    </Button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-3">
                  Deck
                  <select
                    name="deckId"
                    defaultValue={card.deckId}
                    className="cursor-pointer rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {decks.map((deck) => (
                      <option key={deck.id} value={deck.id}>
                        {deck.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-col items-start gap-2 sm:col-span-3">
                  {/* Shows the newly chosen picture, or the current one. */}
                  {(newImage ?? card.image) && (
                    <CardImage image={(newImage ?? card.image)!} />
                  )}
                  {newImage && (
                    <p className="text-xs text-muted-foreground">
                      New picture, saved when you press Save.
                    </p>
                  )}
                  {editPicker === "picture" ? (
                    <PicturePicker
                      card={card}
                      onPicked={(image) => {
                        setNewImage(image);
                        setEditPicker(null);
                      }}
                      onCancel={() => setEditPicker(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditPicker("picture")}
                      >
                        <ImageIcon aria-hidden="true" />
                        {card.image || newImage
                          ? "Change picture"
                          : "Add picture"}
                      </Button>
                      {/* Uploads a picture from the device; it saves with the card on Save. */}
                      <UploadButton
                        label="Upload from device"
                        onFile={async (file) => {
                          try {
                            setNewImage(await uploadPicture(file, "card"));
                          } catch (error) {
                            setError(
                              error instanceof ApiError
                                ? error.message
                                : "Couldn't upload the picture.",
                            );
                          }
                        }}
                      />
                      {card.image && !newImage && (
                        <label className="flex items-center gap-2 text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            name="removeImage"
                            className="accent-primary"
                          />
                          Remove picture
                        </label>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 sm:col-span-3 sm:justify-end">
                  <Button type="button" variant="ghost" onClick={stopEditing}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </form>
            </li>
          ) : (
            <li
              key={card.id}
              className="group relative rounded-2xl border bg-card shadow-float transition hover:-translate-y-1 hover:shadow-float-lifted"
            >
              {/* Opens the card's preview. Edit and Delete sit beside it, not inside, so each is its own control. */}
              <button
                type="button"
                onClick={() => setPreviewId(card.id)}
                className="flex size-full cursor-pointer flex-col gap-3 rounded-2xl p-5 pr-20 text-left focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="block min-w-0">
                  <span
                    lang="ja"
                    className="flex items-center gap-2 font-display text-2xl font-extrabold"
                  >
                    <span className="truncate">{card.word}</span>
                    {card.image && (
                      <ImageIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-label="Has a picture"
                      />
                    )}
                  </span>
                  <span
                    lang="ja"
                    className="block text-sm text-muted-foreground"
                  >
                    {card.reading}
                  </span>
                </span>
                <span className="line-clamp-2 text-sm">
                  {card.meanings.join("; ")}
                </span>
                {card.sentence && (
                  <span
                    lang="ja"
                    className="block truncate text-sm text-muted-foreground"
                  >
                    {card.sentence}
                  </span>
                )}
                <span className="mt-auto flex flex-wrap gap-2 text-xs font-bold">
                  {deckFilter === "all" && (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                      {deckName(card.deckId)}
                    </span>
                  )}
                  <span
                    className={`rounded-full px-2.5 py-1 ${
                      describeDue(card.dueAt) === "due now"
                        ? "bg-again text-again-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {describeDue(card.dueAt)}
                  </span>
                </span>
              </button>

              {/* Shows Edit and Delete in the top corner when the card is hovered or tabbed to. */}
              <div className="absolute top-4 right-4 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${card.word}`}
                  onClick={() => startEditing(card.id)}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${card.word}`}
                  className="hover:text-destructive"
                  onClick={() => remove(card)}
                >
                  <Trash2 />
                </Button>
              </div>
            </li>
          ),
        )}
      </ul>

      {cards.length > 0 && shown.length === 0 && (
        <p className="text-muted-foreground">No cards match “{search}”.</p>
      )}

      {previewCard && (
        <CardPreview
          card={previewCard}
          deckName={deckName(previewCard.deckId)}
          due={describeDue(previewCard.dueAt)}
          onEdit={() => {
            // Swaps the preview for that card's edit form.
            setPreviewId(null);
            startEditing(previewCard.id);
          }}
          onClose={() => setPreviewId(null)}
          onChange={(updated) =>
            setCards(
              (current) =>
                current?.map((c) => (c.id === updated.id ? updated : c)) ??
                null,
            )
          }
        />
      )}
    </div>
  );
}
