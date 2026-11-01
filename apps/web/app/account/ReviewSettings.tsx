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
    return message && <p className="text-sm text-red-500">{message}</p>;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">Review</h2>
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
          className="w-24 rounded-lg border border-zinc-300 bg-transparent px-3 py-1 dark:border-zinc-700"
        />
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Save
        </button>
      </form>
      {message && <p className="text-sm text-zinc-500">{message}</p>}
      <p className="text-sm text-zinc-500">
        Cards you&apos;ve already started always show when due. 0 means no new
        cards today.
      </p>
    </section>
  );
}
