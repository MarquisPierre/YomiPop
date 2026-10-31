"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/authClient";
import { PasswordInput } from "../PasswordInput";

// Shows the user's details and lets them delete their account.
export function AccountSettings() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [hasPassword, setHasPassword] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Sends signed-out visitors to sign in.
  useEffect(() => {
    if (!isPending && !session) router.replace("/sign-in");
  }, [isPending, session, router]);

  // Checks whether the user signs in with a password or only with Google.
  useEffect(() => {
    if (!session) return;
    authClient.listAccounts().then(({ data }) => {
      setHasPassword(
        data?.some((account) => account.providerId === "credential") ?? false,
      );
    });
  }, [session]);

  // Deletes the account and goes back to the home page.
  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setBusy(true);
    setError(null);
    const { error } = await authClient.deleteUser(
      hasPassword ? { password: String(form.get("password")) } : {},
    );
    setBusy(false);

    if (error?.code === "INVALID_PASSWORD") {
      setError("That password is wrong.");
    } else if (error?.code === "SESSION_EXPIRED") {
      setError("Sign out and sign back in, then try again.");
    } else if (error) {
      setError(error.message ?? "Couldn't delete your account.");
    } else {
      router.push("/");
    }
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h1 className="mb-4 text-3xl font-semibold">Account</h1>
        <p>{session.user.name}</p>
        <p className="text-zinc-500">{session.user.email}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-red-300 p-4 dark:border-red-900">
        <h2 className="font-semibold text-red-600">Danger zone</h2>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="self-start rounded-lg border border-red-500 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          >
            Delete account
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="flex flex-col gap-3">
            <p>
              This permanently deletes your account, all your cards and review
              history. This can&apos;t be undone.
            </p>
            {hasPassword && (
              <PasswordInput
                autoComplete="current-password"
                placeholder="Type your password to confirm"
              />
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
              >
                Delete forever
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setError(null);
                }}
                className="rounded-lg px-4 py-2 text-zinc-500 hover:text-current"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
