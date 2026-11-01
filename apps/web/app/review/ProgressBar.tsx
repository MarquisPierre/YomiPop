// Shows how far through the session the user is, as a red bar that fills up.
export function ProgressBar({ done, total }: { done: number; total: number }) {
  const percent = total === 0 ? 0 : (done / total) * 100;

  return (
    <div className="flex w-full items-center gap-3 text-sm text-muted-foreground">
      <div
        role="progressbar"
        aria-label="Session progress"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        className="h-2 flex-1 overflow-hidden rounded-full bg-border"
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
      {done} of {total}
    </div>
  );
}
