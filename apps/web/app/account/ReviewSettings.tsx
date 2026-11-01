"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getSettings, updateSettings, type Settings } from "@/lib/api";

// Lets the user change how many new cards the review brings in each day.
export function ReviewSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Loads the current settings when the page opens.
  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setMessage("Couldn't load your settings."));
  }, []);

  // Saves the new limit and says whether it worked.
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      setSettings(
        await updateSettings({
          newCardsPerDay: Number(form.get("newCardsPerDay")),
        }),
      );
      setMessage("Saved.");
    } catch {
      setMessage("Couldn't save. Use a whole number from 0 to 9999.");
    }
  }

  // Waits for the settings, showing why if they couldn't load.
  if (!settings) {
    return message && <p className="text-sm text-destructive">{message}</p>;
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-float">
      <h2 className="font-display text-lg font-bold">Review</h2>
      <form onSubmit={save} className="flex items-center gap-3">
        <label htmlFor="newCardsPerDay">New cards per day</label>
        <input
          id="newCardsPerDay"
          name="newCardsPerDay"
          type="number"
          min={0}
          max={9999}
          step={1}
          required
          defaultValue={settings.newCardsPerDay}
          className="h-10 w-24 rounded-xl border border-input bg-card px-3 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <button
          type="submit"
          className="h-10 cursor-pointer rounded-full bg-primary px-5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Save
        </button>
      </form>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
      <p className="text-sm text-muted-foreground">
        Cards you&apos;ve already started always show when due. 0 means no new
        cards today.
      </p>
    </section>
  );
}
