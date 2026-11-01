import Link from "next/link";

// Shows the YomiPop name with its red hanko-style stamp, linking home.
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      {/* Tilts the stamp a little, like one pressed by hand. */}
      <span
        lang="ja"
        aria-hidden="true"
        className="flex size-9 -rotate-[4deg] items-center justify-center rounded-[9px] bg-primary font-display text-xl font-extrabold text-primary-foreground"
      >
        読
      </span>
      <span className="font-display text-xl font-extrabold">YomiPop</span>
    </Link>
  );
}
