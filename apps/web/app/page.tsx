import Link from "next/link";

// Shows the home page.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-4xl font-semibold">YomiPop</h1>
      <Link
        href="/review"
        className="rounded-lg bg-zinc-900 px-6 py-3 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Start review
      </Link>
    </main>
  );
}
