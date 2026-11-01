import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewSession } from "./ReviewSession";

export const metadata: Metadata = { title: "Review · YomiPop" };

// Shows the review page.
export default function ReviewPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      {/* Waits for the deck in the address, which only the browser knows. */}
      <Suspense>
        <ReviewSession />
      </Suspense>
    </main>
  );
}
