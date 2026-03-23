import { ImageResponse } from "next/og";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase/server";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatKickoff(ts: Timestamp): string {
  const d = ts.toDate();
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function resolveMatchId(routeId: string): Promise<string | null> {
  const directSnap = await getDoc(doc(db, "matches", routeId));
  if (directSnap.exists()) return routeId;

  const asNumber = Number(routeId);
  if (!Number.isInteger(asNumber) || asNumber <= 0) return null;

  const q = query(collection(db, "matches"), where("matchNumber", "==", asNumber), limit(1));
  const s = await getDocs(q);
  return s.docs[0]?.id ?? null;
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id: routeId } = await params;

  let match: MatchDoc | null = null;
  let home: TeamDoc | null = null;
  let away: TeamDoc | null = null;

  try {
    const matchId = await resolveMatchId(routeId);
    if (matchId) {
      const matchSnap = await getDoc(doc(db, "matches", matchId));
      if (matchSnap.exists()) {
        match = matchSnap.data() as MatchDoc;
        const [homeSnap, awaySnap] = await Promise.all([
          getDoc(doc(db, "teams", match.homeTeamId)),
          getDoc(doc(db, "teams", match.awayTeamId)),
        ]);
        home = homeSnap.exists() ? (homeSnap.data() as TeamDoc) : null;
        away = awaySnap.exists() ? (awaySnap.data() as TeamDoc) : null;
      }
    }
  } catch {
    // ignore and fallback
  }

  const homeName = home?.nameJa?.trim() || match?.homeTeamId || "HOME";
  const awayName = away?.nameJa?.trim() || match?.awayTeamId || "AWAY";
  const stage = match?.stageNameJa?.trim() || "MATCH";
  const group = match?.groupNameJa?.trim();
  const stageLabel = group ? `${stage} / ${group}` : stage;
  const kickoffLabel = match?.kickoffAt ? formatKickoff(match.kickoffAt as Timestamp) : "";
  const matchNo = typeof match?.matchNumber === "number" ? `MATCH ${match.matchNumber}` : "WC2026";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px",
          background: "linear-gradient(135deg, #040913 0%, #0b1f3a 45%, #2b1d5f 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.2 }}>{matchNo}</div>
          <div style={{ fontSize: 22, fontWeight: 800, opacity: 0.9 }}>WC2026</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "center" }}>
          <div style={{ fontSize: 30, fontWeight: 900, opacity: 0.92 }}>{stageLabel}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ fontSize: 64, fontWeight: 900, textAlign: "right", maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {homeName}
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, opacity: 0.9 }}>vs</div>
            <div style={{ fontSize: 64, fontWeight: 900, textAlign: "left", maxWidth: 520, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {awayName}
            </div>
          </div>
          {kickoffLabel ? <div style={{ fontSize: 28, fontWeight: 800, opacity: 0.85 }}>{kickoffLabel}</div> : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ fontSize: 20, fontWeight: 800, opacity: 0.86 }}>予想はこちら</div>
          <div style={{ fontSize: 20, fontWeight: 800, opacity: 0.86 }}>#WC2026</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
