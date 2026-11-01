"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { authClient } from "@/lib/authClient";
import { PasswordInput } from "../PasswordInput";
import { ReviewSettings } from "./ReviewSettings";

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
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-extrabold">Account</h1>
      <section className="flex items-center gap-4 rounded-2xl border bg-card p-6 shadow-float">
        <span className="flex size-14 items-center justify-center rounded-full bg-foreground font-display text-2xl font-bold text-background">
          {session.user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="font-display text-xl font-bold">{session.user.name}</p>
          <p className="truncate text-muted-foreground">{session.user.email}</p>
        </div>
      </section>

      <ReviewSettings />

      <section className="flex flex-col gap-3 rounded-2xl border border-destructive/40 bg-card p-6 shadow-float">
        <h2 className="font-display text-lg font-bold text-destructive">
          Danger zone
        </h2>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="h-10 cursor-pointer self-start rounded-full border border-destructive px-5 font-semibold text-destructive transition-colors hover:bg-destructive/10"
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
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="h-10 cursor-pointer rounded-full bg-destructive px-5 font-semibold text-white transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                Delete forever
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setError(null);
                }}
                className="h-10 cursor-pointer rounded-full px-5 font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
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
