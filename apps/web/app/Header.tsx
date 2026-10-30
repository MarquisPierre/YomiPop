"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/authClient";

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
          <Link href="/review" className="text-zinc-500 hover:text-current">
            Review
          </Link>
          <Link href="/cards" className="text-zinc-500 hover:text-current">
            Cards
          </Link>
        </>
      )}

      <div className="ml-auto text-sm text-zinc-500">
        {isPending ? null : session ? (
          <>
            {session.user.name} ·{" "}
            <button onClick={signOut} className="underline">
              Sign out
            </button>
          </>
        ) : (
          <Link href="/sign-in" className="underline">
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
