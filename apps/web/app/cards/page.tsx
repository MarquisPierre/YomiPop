import type { Metadata } from "next";
import { CardList } from "./CardList";

export const metadata: Metadata = { title: "Cards · YomiPop" };

// Shows the card list page.
export default function CardsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 p-6">
      <CardList />
    </main>
  );
}
