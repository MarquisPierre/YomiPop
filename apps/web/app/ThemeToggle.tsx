"use client";

import { useSyncExternalStore } from "react";

// Names the browser storage slot that remembers the chosen theme.
const THEME_KEY = "yomipop.theme";

// Reads the theme the page is showing.
function getTheme(): string {
  return document.documentElement.getAttribute("data-theme") ?? "light";
}

// Watches the page for theme changes, e.g. from another toggle.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

// Shows a button that switches between light and dark, and remembers the choice.
export function ThemeToggle() {
  // Reads the theme once the page is in the browser. The server can't know it, so it starts empty.
  const theme = useSyncExternalStore(subscribe, getTheme, () => null);

  // Flips the theme and saves it. Storage can be blocked, so the save is allowed to fail.
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage is blocked, so the choice lasts until the page closes.
    }
  }

  // Waits for the browser before showing the icon, so it's never the wrong one.
  if (!theme) return null;

  return (
    <button
      onClick={toggle}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="rounded-md px-1 text-base hover:bg-zinc-100 dark:hover:bg-zinc-900"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
