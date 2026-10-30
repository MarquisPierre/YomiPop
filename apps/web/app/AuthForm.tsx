"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { authClient } from "@/lib/authClient";

// Styles the text boxes in the form.
const INPUT_CLASS =
  "rounded-lg border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

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

// Draws an open eye, for showing the password.
function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Draws a crossed-out eye, for hiding the password.
function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-2.4 3.4" />
      <path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M2 2l20 20" />
    </svg>
  );
}

// Shows the sign-in or sign-up form and sends the user to their reviews afterwards.
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
    const { error } = signingUp
      ? await authClient.signUp.email({
          name: String(form.get("name")),
          email,
          password,
        })
      : await authClient.signIn.email({
          email,
          password,
          rememberMe,
        });
    setBusy(false);

    if (error) {
      setError(error.message ?? "Something went wrong.");
      return;
    }
    saveRememberedEmail(rememberMe ? email : null);
    router.push("/review");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-sm flex-col gap-3"
    >
      <h1 className="mb-2 text-3xl font-semibold">
        {signingUp ? "Sign up" : "Sign in"}
      </h1>

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
      <div className="relative flex">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          autoComplete={signingUp ? "new-password" : "current-password"}
          minLength={8}
          required
          className={`${INPUT_CLASS} flex-1 pr-10`}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {!signingUp && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="rememberMe" defaultChecked />
          Remember me
        </label>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-zinc-900 py-2 text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
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
