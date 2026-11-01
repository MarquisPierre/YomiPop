"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// Names the browser storage slot that remembers the chosen theme.
const THEME_KEY = "yomipop.theme";

// Reads the theme the page is showing.
function getTheme(): string {
  return document.documentElement.getAttribute("data-theme") ?? "light";
}

// Watches the page for theme changes, e.g. from the menu or another tab's toggle.
function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

// Reads the current theme once the page is in the browser. The server can't know it, so it starts empty.
export function useTheme(): string | null {
  return useSyncExternalStore(subscribe, getTheme, () => null);
}

// Flips the theme and saves it. Storage can be blocked, so the save is allowed to fail.
export function toggleTheme(): void {
  const next = getTheme() === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage is blocked, so the choice lasts until the page closes.
  }
}

// Shows a round sun or moon button that switches the theme, for visitors who aren't signed in.
export function ThemeToggle() {
  const theme = useTheme();

  // Waits for the browser before showing the icon, so it's never the wrong one.
  if (!theme) return null;

  const dark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}
