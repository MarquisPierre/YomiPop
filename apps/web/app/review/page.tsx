import type { Metadata } from "next";
import { ReviewSession } from "./ReviewSession";

export const metadata: Metadata = { title: "Review · YomiPop" };

// Shows the review page.
export default function ReviewPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <ReviewSession />
    </main>
  );
}
