"use client";

import { LogOut, Moon, Sun, User } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/authClient";
import { Logo } from "./Logo";
import { ThemeToggle, toggleTheme, useTheme } from "./ThemeToggle";

// Lists the main pages in the header.
const NAV = [
  { href: "/decks", label: "Decks" },
  { href: "/cards", label: "Cards" },
];

// Shows the logo, the main pages and the account menu at the top of every page.
// It stays put while scrolling, with a frosted see-through background.
export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const { data: session, isPending } = authClient.useSession();

  // Signs out and goes back to the home page.
  async function signOut() {
    await authClient.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Logo />

        {session && (
          <nav className="flex gap-6 self-stretch">
            {NAV.map(({ href, label }) => {
              // Underlines the page you're on, including the review page under Decks.
              const current =
                pathname.startsWith(href) ||
                (href === "/decks" && pathname.startsWith("/review"));
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={current ? "page" : undefined}
                  className={`flex items-center border-b-[3px] pt-[3px] text-[15px] font-medium transition-colors ${
                    current
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isPending ? null : session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* Shows the user's initial in a round button that opens the menu. */}
                <button
                  aria-label="Account menu"
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full border-2 border-border bg-foreground font-display text-base font-bold text-background transition-colors hover:border-primary data-[state=open]:border-primary"
                >
                  {session.user.name.slice(0, 1).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-0.5 px-3 py-2">
                  <span className="font-semibold">{session.user.name}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {session.user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <User />
                    Account
                  </Link>
                </DropdownMenuItem>
                {/* Keeps the menu open after switching, so the change can be seen. */}
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    toggleTheme();
                  }}
                >
                  {theme === "dark" ? <Sun /> : <Moon />}
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={signOut}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <ThemeToggle />
              <Button asChild variant="ghost">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
