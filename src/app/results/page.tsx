"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

type MatchRow = MatchDoc & { id: string };

function formatTs(ts: Timestamp): string {
  const d = ts.toDate();
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResultsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teams, setTeams] = useState<Map<string, TeamDoc>>(new Map());

  useEffect(() => {
    async function run() {
      setBusy(true);
      setError(null);
      try {
        const teamSnap = await getDocs(collection(db, "teams"));
        const teamMap = new Map<string, TeamDoc>();
        for (const docSnap of teamSnap.docs) {
          teamMap.set(docSnap.id, docSnap.data() as TeamDoc);
        }
        setTeams(teamMap);

        const q = query(
          collection(db, "matches"),
          where("status", "==", "FINISHED"),
          orderBy("kickoffAt", "desc")
        );
        const matchSnap = await getDocs(q);
        const rows: MatchRow[] = matchSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as MatchDoc),
        }));
        setMatches(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, []);

  const rows = useMemo(() => {
    return matches.map((m) => {
      const home = teams.get(m.homeTeamId)?.nameJa ?? m.homeTeamId;
      const away = teams.get(m.awayTeamId)?.nameJa ?? m.awayTeamId;
      return {
        ...m,
        homeName: home,
        awayName: away,
      };
    });
  }, [matches, teams]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ margin: 0 }}>大会結果</h1>
      </div>

      <p>{busy ? "読込中..." : `Finished: ${rows.length}`}</p>
      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                No
              </th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                キックオフ
              </th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                対戦
              </th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                スコア
              </th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                ステージ
              </th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                グループ
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.matchNumber}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{formatTs(m.kickoffAt)}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  <Link href={`/matches/${m.id}`}>{m.homeName} vs {m.awayName}</Link>
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  {typeof m.homeScore === "number" && typeof m.awayScore === "number"
                    ? `${m.homeScore}-${m.awayScore}`
                    : "-"}
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.stageNameJa}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.groupNameJa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
