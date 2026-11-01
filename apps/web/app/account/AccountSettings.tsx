"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, uploadPicture } from "@/lib/api";
import { authClient } from "@/lib/authClient";
import { PasswordInput } from "../PasswordInput";
import { UploadButton } from "../UploadButton";
import { ReviewSettings } from "./ReviewSettings";

// Shows the user's details and lets them delete their account.
export function AccountSettings() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [hasPassword, setHasPassword] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Holds a message about the profile, like "Saved." or why an upload failed.
  const [profileNote, setProfileNote] = useState<string | null>(null);

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

  // Saves a new name with Better Auth's built-in profile update.
  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name")).trim();
    const { error } = await authClient.updateUser({ name });
    setProfileNote(
      error ? (error.message ?? "Couldn't save your name.") : "Saved.",
    );
  }

  // Uploads a new profile picture and saves its link on the account.
  async function changePicture(file: File) {
    try {
      const { url } = await uploadPicture(file, "avatar");
      const { error } = await authClient.updateUser({ image: url });
      setProfileNote(
        error ? (error.message ?? "Couldn't save the picture.") : null,
      );
    } catch (error) {
      setProfileNote(
        error instanceof ApiError
          ? error.message
          : "Couldn't upload the picture.",
      );
    }
  }

  // Takes the profile picture off, going back to the initial.
  async function removePicture() {
    const { error } = await authClient.updateUser({ image: null });
    setProfileNote(
      error ? (error.message ?? "Couldn't remove the picture.") : null,
    );
  }

  if (!session) return null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-3xl font-extrabold">Account</h1>
      <section className="flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-float">
        <h2 className="font-display text-lg font-bold">Profile</h2>
        <div className="flex flex-wrap items-center gap-4">
          {/* Shows the profile picture, or the initial when there isn't one. */}
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground font-display text-2xl font-bold text-background">
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt="Your profile picture"
                className="size-full object-cover"
              />
            ) : (
              session.user.name.slice(0, 1).toUpperCase()
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            <UploadButton label="Upload picture" onFile={changePicture} />
            {session.user.image && (
              <Button variant="ghost" size="sm" onClick={removePicture}>
                Remove picture
              </Button>
            )}
          </div>
        </div>
        {/* Lets the user change the name shown in the header and menu. */}
        <form onSubmit={saveName} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-sm text-muted-foreground">
            Name
            <Input
              name="name"
              defaultValue={session.user.name}
              required
              maxLength={50}
              className="text-foreground"
            />
          </label>
          <Button type="submit">Save</Button>
        </form>
        <p className="text-sm text-muted-foreground">{session.user.email}</p>
        {profileNote && (
          <p className="text-sm text-muted-foreground">{profileNote}</p>
        )}
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
