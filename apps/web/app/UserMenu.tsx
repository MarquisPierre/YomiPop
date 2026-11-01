"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/authClient";

// Shows the way to the decks when signed in, or sign-in and sign-up when not.
export function UserMenu() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <p className="text-muted-foreground">Loading…</p>;

  if (!session) {
    return (
      <div className="flex gap-3">
        <Button asChild size="lg">
          <Link href="/sign-up">Get started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/sign-in">Sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <Button asChild size="lg">
      <Link href="/decks">Your decks</Link>
    </Button>
  );
}
