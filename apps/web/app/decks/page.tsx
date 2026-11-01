import type { Metadata } from "next";
import { DeckList } from "./DeckList";

export const metadata: Metadata = { title: "Decks · YomiPop" };

// Shows the decks page.
export default function DecksPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-6">
      <DeckList />
    </main>
  );
}
