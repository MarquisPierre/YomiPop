"use client";

import { ImageIcon, Pencil } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateCard, type Card } from "@/lib/api";
import { CardImage } from "../review/CardImage";
import { Sentence } from "../review/Sentence";
import { SpeakButton } from "../review/speak";
import { PicturePicker } from "./PicturePicker";

// Shows a card the way it looks after revealing it in review, floating over the page.
// The dialog keeps keyboard focus inside it, and Escape or a click outside closes it.
// The Cards page works out the deck name and due time, since it already has them.
export function CardPreview({
  card,
  deckName,
  due,
  onEdit,
  onClose,
  onChange,
}: {
  card: Card;
  deckName: string;
  due: string;
  onEdit: () => void;
  onClose: () => void;
  // Passes on the card after its picture changes, so the page can show it.
  onChange: (updated: Card) => void;
}) {
  // Says whether the picture picker is open.
  const [choosingPicture, setChoosingPicture] = useState(false);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <div className="flex flex-col items-center gap-4 pt-2 text-center">
          <DialogTitle
            lang="ja"
            className="font-display text-6xl leading-none font-extrabold"
          >
            {card.word}
          </DialogTitle>

          {/* Shows the reading with a button that reads it aloud. */}
          <DialogDescription
            lang="ja"
            className="flex items-center gap-2 text-xl text-muted-foreground"
          >
            {card.reading}
            <SpeakButton
              text={card.reading || card.word}
              label="Read the word"
            />
          </DialogDescription>

          {card.image && <CardImage image={card.image} />}

          {/* Lets the user add or change the picture without leaving the preview. */}
          {choosingPicture && (
            <PicturePicker
              card={card}
              onPicked={async (image) => {
                const updated = await updateCard(card.id, { image });
                setChoosingPicture(false);
                onChange(updated);
              }}
              onCancel={() => setChoosingPicture(false)}
            />
          )}

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
          <div className="flex w-full flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm text-muted-foreground">
            <span>
              {deckName} · {due} · reviewed {card.reps}×
            </span>
            <span className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setChoosingPicture(true)}
              >
                <ImageIcon aria-hidden="true" />
                {card.image ? "Change picture" : "Add picture"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Pencil aria-hidden="true" />
                Edit
              </Button>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
