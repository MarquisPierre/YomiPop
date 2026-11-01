"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";
import { ThemeToggle } from "./ThemeToggle";

// Shows the app name, the review link and the signed-in user at the top of every page.
export function Header() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  // Signs out and goes back to the home page.
  async function signOut() {
    await authClient.signOut();
    router.push("/");
  }

  return (
    <header className="flex items-center gap-6 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
      <Link href="/" className="font-semibold">
        YomiPop
      </Link>
      {session && (
        <>
          <Link href="/decks" className="text-zinc-500 hover:text-current">
            Decks
          </Link>
          <Link href="/cards" className="text-zinc-500 hover:text-current">
            Cards
          </Link>
        </>
      )}

      <div className="ml-auto flex items-center gap-3 text-sm text-zinc-500">
        <ThemeToggle />
        {isPending ? null : session ? (
          <span>
            <Link href="/account" className="hover:text-current">
              {session.user.name}
            </Link>{" "}
            ·{" "}
            <button onClick={signOut} className="underline">
              Sign out
            </button>
          </span>
        ) : (
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
