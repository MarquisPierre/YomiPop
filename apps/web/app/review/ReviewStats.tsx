import { Flame } from "lucide-react";
import type { ReviewStats as Stats } from "@/lib/api";

// Shows the due counts and today's reviews in one line, with the streak in red at the end.
export function ReviewStats({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  return (
    <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span>
        <b className="text-hanko-text">{stats.dueNow} due now</b> ·{" "}
        {stats.laterToday} later today · {stats.reviewedToday} reviewed today
      </span>
      {stats.streak > 0 && (
        <span className="ml-auto flex items-center gap-1 font-bold text-hanko-text">
          <Flame className="size-4" aria-hidden="true" />
          {stats.streak}-day streak
        </span>
      )}
    </div>
  );
}
