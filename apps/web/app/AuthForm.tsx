"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/authClient";
import { BUTTON_CLASS, INPUT_CLASS } from "./formStyles";
import { PasswordInput } from "./PasswordInput";

// Names the browser storage slot that holds the remembered email.
const EMAIL_KEY = "yomipop.rememberedEmail";

// Reads the remembered email, if any. Storage can be blocked, so failures count as none.
function loadRememberedEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

// Remembers the email, or forgets it when given null.
function saveRememberedEmail(email: string | null): void {
  try {
    if (email) localStorage.setItem(EMAIL_KEY, email);
    else localStorage.removeItem(EMAIL_KEY);
  } catch {
    // Storage is blocked, so there's nothing to remember with.
  }
}

// Draws Google's "G" logo in its four colours.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

// Shows the sign-in or sign-up form and sends the user to their reviews afterwards.
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const emailInput = useRef<HTMLInputElement>(null);
  const signingUp = mode === "sign-up";

  // Fills in the remembered email when signing in.
  useEffect(() => {
    const email = loadRememberedEmail();
    if (!signingUp && email && emailInput.current) {
      emailInput.current.value = email;
    }
  }, [signingUp]);

  // Sends the form to Better Auth and moves on if it worked.
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const rememberMe = signingUp || form.get("rememberMe") === "on";

    setBusy(true);
    setError(null);
    setUnverifiedEmail(null);
    const { error } = signingUp
      ? await authClient.signUp.email({
          name: String(form.get("name")),
          email,
          password,
          callbackURL: "/review",
        })
      : await authClient.signIn.email({
          email,
          password,
          rememberMe,
        });
    setBusy(false);

    if (error?.code === "EMAIL_NOT_VERIFIED") {
      setError("Verify your email first. Check your inbox for the link.");
      setUnverifiedEmail(email);
      return;
    }
    if (error) {
      setError(error.message ?? "Something went wrong.");
      return;
    }
    saveRememberedEmail(rememberMe ? email : null);
    if (signingUp) setSentTo(email);
    else router.push("/review");
  }

  // Sends the verification link again.
  async function resendEmail(email: string) {
    setBusy(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/review",
    });
    setBusy(false);
    setUnverifiedEmail(null);
    if (error) setError(error.message ?? "Couldn't send the email.");
    else setSentTo(email);
  }

  // Sends the user to Google, which sends them back to their reviews once they've signed in.
  async function continueWithGoogle() {
    setBusy(true);
    setError(null);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/review",
    });
    if (error) {
      setBusy(false);
      setError(error.message ?? "Couldn't reach Google.");
    }
  }

  if (sentTo) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-3">
        <h1 className="mb-2 text-3xl font-semibold">Check your email</h1>
        <p>
          We sent a link to <strong>{sentTo}</strong>. Click it to verify your
          email and sign in.
        </p>
        <button
          type="button"
          onClick={() => resendEmail(sentTo)}
          disabled={busy}
          className="text-left text-sm text-zinc-500 underline disabled:opacity-50"
        >
          Didn&apos;t get it? Send it again
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <h1 className="mb-2 text-3xl font-semibold">
        {signingUp ? "Sign up" : "Sign in"}
      </h1>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={busy}
        className="flex items-center justify-center gap-2 rounded-lg border border-zinc-300 py-2 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
        or
        <span className="h-px flex-1 bg-zinc-300 dark:bg-zinc-700" />
      </div>

      {signingUp && (
        <input
          name="name"
          placeholder="Name"
          required
          className={INPUT_CLASS}
        />
      )}
      <input
        ref={emailInput}
        name="email"
        type="email"
        placeholder="Email"
        autoComplete="email"
        required
        className={INPUT_CLASS}
      />
      <PasswordInput
        autoComplete={signingUp ? "new-password" : "current-password"}
      />
      {!signingUp && (
        <Link
          href="/forgot-password"
          className="-mt-1 self-end text-sm text-zinc-500 underline"
        >
          Forgot password?
        </Link>
      )}

      {!signingUp && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="rememberMe" defaultChecked />
          Remember me
        </label>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {unverifiedEmail && (
        <button
          type="button"
          onClick={() => resendEmail(unverifiedEmail)}
          disabled={busy}
          className="text-left text-sm underline disabled:opacity-50"
        >
          Resend email
        </button>
      )}

      <button type="submit" disabled={busy} className={BUTTON_CLASS}>
        {signingUp ? "Sign up" : "Sign in"}
      </button>

      <p className="text-center text-sm text-zinc-500">
        {signingUp ? "Have an account? " : "New here? "}
        <Link href={signingUp ? "/sign-in" : "/sign-up"} className="underline">
          {signingUp ? "Sign in" : "Sign up"}
        </Link>
      </p>
    </form>
  );
}
