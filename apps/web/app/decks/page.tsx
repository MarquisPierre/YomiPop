import type { Metadata } from "next";
import { DeckList } from "./DeckList";

export const metadata: Metadata = { title: "Decks · YomiPop" };

// Shows the decks page.
export default function DecksPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <DeckList />
    </main>
  );
}
