"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, findImages, type Card, type FoundImage } from "@/lib/api";
import { CardImage } from "../review/CardImage";

// Styles the picker's buttons.
const BUTTON_CLASS =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50";

// Finds pictures for a card on Unsplash, lets the user flip through them, and hands back the one picked.
export function PicturePicker({
  card,
  onPicked,
  onCancel,
}: {
  card: Card;
  // Passes on the picture the user chose. The caller decides whether to save it now.
  onPicked: (image: FoundImage) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [images, setImages] = useState<FoundImage[]>([]);
  const [index, setIndex] = useState(0);
  const [note, setNote] = useState<string | null>("Finding pictures…");
  const [busy, setBusy] = useState(false);

  // Shows the pictures found, or why there are none.
  function show(found: FoundImage[]) {
    setImages(found);
    setIndex(0);
    setNote(found.length > 0 ? null : "No pictures found.");
  }

  // Shows why the search failed, like the daily AI limit.
  function fail(error: unknown) {
    setNote(
      error instanceof ApiError ? error.message : "Couldn't find pictures.",
    );
  }

  // Finds pictures when the picker opens, reusing saved results when it can.
  useEffect(() => {
    findImages(card, false).then(show, fail);
  }, [card]);

  // Shows the next picture, or asks for new ones after the last.
  function next() {
    if (index + 1 < images.length) {
      setIndex(index + 1);
      return;
    }
    setNote("Finding pictures…");
    findImages(card, true).then(show, fail);
  }

  // Hands the picture on screen to the caller, showing a note if saving it fails.
  async function use() {
    const image = images[index];
    if (!image) return;
    setBusy(true);
    try {
      await onPicked(image);
    } catch {
      setNote("Couldn't save the picture.");
      setBusy(false);
    }
  }

  const image = images[index];
  return (
    <div className="flex w-full flex-col items-center gap-2 rounded-xl border bg-muted/40 p-3">
      {image && !note && <CardImage image={image} />}
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      <div className="flex gap-1">
        {images.length > 0 && (
          <button
            type="button"
            onClick={next}
            disabled={busy}
            className={BUTTON_CLASS}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Another
          </button>
        )}
        {image && !note && (
          <button
            type="button"
            onClick={use}
            disabled={busy}
            className={BUTTON_CLASS}
          >
            Use this
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={BUTTON_CLASS}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
