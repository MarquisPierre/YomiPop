import type { Metadata } from "next";
import { Suspense } from "react";
import { CardList } from "./CardList";

export const metadata: Metadata = { title: "Cards · YomiPop" };

// Shows the card list page.
export default function CardsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      {/* Waits for the deck in the address, which only the browser knows. */}
      <Suspense>
        <CardList />
      </Suspense>
    </main>
  );
}
