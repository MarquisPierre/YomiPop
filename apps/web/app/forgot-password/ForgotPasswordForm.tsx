"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/authClient";
import { BUTTON_CLASS, INPUT_CLASS } from "../formStyles";

// Asks for an email and sends a reset link to it.
export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Asks Better Auth to email the reset link.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setBusy(true);
    setError(null);
    const { error } = await authClient.requestPasswordReset({
      email: String(form.get("email")),
      redirectTo: "/reset-password",
    });
    setBusy(false);

    if (error) setError(error.message ?? "Something went wrong.");
    else setSent(true);
  }

  // Says the same thing whether or not the email has an account, so the form can't reveal who signed up.
  if (sent) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-3xl font-semibold">Check your email</h1>
        <p>
          If that email has an account, we sent it a link to reset the password.
        </p>
        <Link href="/sign-in" className="text-sm text-zinc-500 underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <h1 className="mb-2 text-3xl font-semibold">Forgot password</h1>
      <p className="text-sm text-zinc-500">
        Enter your email and we&apos;ll send you a link to choose a new
        password.
      </p>
      <input
        name="email"
        type="email"
        placeholder="Email"
        autoComplete="email"
        required
        className={INPUT_CLASS}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button type="submit" disabled={busy} className={BUTTON_CLASS}>
        Send reset link
      </button>
      <Link
        href="/sign-in"
        className="text-center text-sm text-zinc-500 underline"
      >
        Back to sign in
      </Link>
    </form>
  );
}
