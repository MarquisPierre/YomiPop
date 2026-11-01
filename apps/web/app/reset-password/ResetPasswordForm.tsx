"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/authClient";
import { BUTTON_CLASS } from "../formStyles";
import { PasswordInput } from "../PasswordInput";

// Shows that the link can't be used and offers a new one.
function BadLink() {
  return (
    <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border bg-card p-8 shadow-float">
      <h1 className="mb-2 font-display text-3xl font-extrabold">
        Link expired
      </h1>
      <p>This reset link has expired or was already used.</p>
      <Link href="/forgot-password" className="text-sm underline">
        Get a new link
      </Link>
    </div>
  );
}

// Lets the user choose a new password with the token from their email.
export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [badLink, setBadLink] = useState(false);

  // Saves the new password.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setBusy(true);
    setError(null);
    const { error } = await authClient.resetPassword({
      newPassword: String(form.get("password")),
      token: token ?? "",
    });
    setBusy(false);

    if (error?.code === "INVALID_TOKEN") setBadLink(true);
    else if (error) setError(error.message ?? "Something went wrong.");
    else setDone(true);
  }

  if (!token || badLink) return <BadLink />;

  if (done) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border bg-card p-8 shadow-float">
        <h1 className="mb-2 font-display text-3xl font-extrabold">
          Password changed
        </h1>
        <p>Sign in with your new password.</p>
        <Link href="/sign-in" className={`${BUTTON_CLASS} text-center`}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border bg-card p-8 shadow-float"
    >
      <h1 className="mb-2 font-display text-3xl font-extrabold">
        Choose a new password
      </h1>
      <PasswordInput autoComplete="new-password" placeholder="New password" />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={busy} className={BUTTON_CLASS}>
        Save password
      </button>
    </form>
  );
}
