import type { Timestamp } from "firebase/firestore";

import type { TeamDoc } from "@/lib/fifa/normalize";

export function localFlagSrc(team: TeamDoc | undefined): string | null {
  const code = team?.code?.trim();
  if (!code) return null;
  return `/国旗/${code.toUpperCase()}.png`;
}

export function formatScore(status: string, homeScore: unknown, awayScore: unknown): string {
  if (status !== "FINISHED") return "-";
  if (typeof homeScore !== "number" || typeof awayScore !== "number") return "-";
  return `${homeScore}-${awayScore}`;
}

export function formatTs(ts: Timestamp): string {
  const d = ts.toDate();
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
