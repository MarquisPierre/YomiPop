// Shows how far through the session the user is.
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : (done / total) * 100;

  return (
    <div className="flex w-full items-center gap-3 text-sm text-zinc-500">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-100"
          style={{ width: `${percent}%` }}
        />
      </div>
      {done} of {total}
    </div>
  );
}
