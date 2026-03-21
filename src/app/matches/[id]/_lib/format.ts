import type { Timestamp } from "firebase/firestore";

import type { TeamDoc } from "@/lib/fifa/normalize";

export function localFlagSrc(team: TeamDoc | null): string | null {
  const code = team?.code?.trim();
  if (!code) return null;
  return `/国旗/${code.toUpperCase()}.png`;
}

export function displayTeamName(team: TeamDoc | null, fallback: string): string {
  const code = team?.code?.trim()?.toUpperCase();
  const raw = team?.nameJa?.trim();
  if (code === "NZL" || raw === "New Zealand") return "ニュージーランド";
  return raw || fallback;
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

export function formatKickoff(ts: Timestamp): { date: string; time: string } {
  const d = ts.toDate();
  const date = d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const time = d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return { date, time };
}
