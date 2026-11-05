import { Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./UserMenu";

// Points at the extension's Chrome Web Store listing.
const STORE_URL =
  "https://chromewebstore.google.com/detail/yomipop/ijooliheidehdicjpmnhhaiioajlmgmj";

// Shows the home page: the stamp, the name, a one-line pitch, and the way in.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      {/* Shows a big version of the logo's stamp, tilted like one pressed by hand. */}
      <span
        lang="ja"
        aria-hidden="true"
        className="flex size-24 -rotate-[4deg] items-center justify-center rounded-3xl bg-primary font-display text-6xl font-extrabold text-primary-foreground shadow-float"
      >
        読
      </span>
      <h1 className="font-display text-5xl font-extrabold">YomiPop</h1>
      <p className="max-w-md text-lg text-muted-foreground">
        Read Japanese anywhere on the web, save the words you meet, and review
        them on cards that come back right before you forget.
      </p>
      <UserMenu />
      {/* Links to the extension, which saves the words this site reviews. Opens in a new tab. */}
      <Button asChild variant="ghost">
        <a href={STORE_URL} target="_blank" rel="noopener noreferrer">
          <Puzzle aria-hidden="true" />
          Add the extension to Chrome
        </a>
      </Button>
    </main>
  );
}
