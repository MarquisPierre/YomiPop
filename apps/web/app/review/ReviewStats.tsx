import type { ReviewStats as Stats } from "@/lib/api";

// Shows the due counts, today's reviews and the streak in one line.
export function ReviewStats({ stats }: { stats: Stats | null }) {
  if (!stats) return null;

  const parts = [
    `${stats.dueNow} due now`,
    `${stats.laterToday} more later today`,
    `${stats.reviewedToday} reviewed today`,
  ];
  if (stats.streak > 0) parts.push(`🔥 ${stats.streak}-day streak`);

  return <p className="text-sm text-zinc-500">{parts.join(" · ")}</p>;
}
