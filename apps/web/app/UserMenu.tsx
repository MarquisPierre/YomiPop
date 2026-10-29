"use client";

import Link from "next/link";
import { authClient } from "@/lib/authClient";

// Styles the main button on the home page.
const PRIMARY_CLASS =
  "rounded-lg bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";

// Styles the secondary buttons on the home page.
const SECONDARY_CLASS =
  "rounded-lg border border-zinc-300 px-6 py-3 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900";

// Shows review and sign-out when signed in, or sign-in and sign-up when not.
export function UserMenu() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <p className="text-zinc-500">Loading…</p>;

  if (!session) {
    return (
      <div className="flex gap-3">
        <Link href="/sign-in" className={PRIMARY_CLASS}>
          Sign in
        </Link>
        <Link href="/sign-up" className={SECONDARY_CLASS}>
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <Link href="/review" className={PRIMARY_CLASS}>
        Start review
      </Link>
      <p className="text-sm text-zinc-500">
        Signed in as {session.user.name} ·{" "}
        <button onClick={() => authClient.signOut()} className="underline">
          Sign out
        </button>
      </p>
    </div>
  );
}
