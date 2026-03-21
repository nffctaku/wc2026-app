"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, Timestamp } from "firebase/firestore";

import { db } from "@/lib/firebase/client";

type UserDoc = {
  idNo?: number;
  nickname?: string;
  email?: string;
};

type UserStatsDoc = {
  uid: string;
  totalPoints: number;
  scoringVersion?: number;
  updatedAt?: Timestamp;
};

type Row = {
  uid: string;
  idNo: number | null;
  nickname: string;
  totalPoints: number;
  scoringVersion: number | null;
};

export default function RankingPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    async function run() {
      setBusy(true);
      setError(null);
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const userMap = new Map<string, UserDoc>();
        for (const d of usersSnap.docs) {
          userMap.set(d.id, d.data() as UserDoc);
        }

        const statsQ = query(collection(db, "userStats"), orderBy("totalPoints", "desc"));
        const statsSnap = await getDocs(statsQ);

        const r: Row[] = statsSnap.docs.map((d) => {
          const s = d.data() as UserStatsDoc;
          const u = userMap.get(s.uid);
          return {
            uid: s.uid,
            idNo: typeof u?.idNo === "number" ? u.idNo : null,
            nickname: u?.nickname ?? "(no name)",
            totalPoints: typeof s.totalPoints === "number" ? s.totalPoints : 0,
            scoringVersion: typeof s.scoringVersion === "number" ? s.scoringVersion : null,
          };
        });

        setRows(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, []);

  const ranked = useMemo(() => {
    let currentRank = 0;
    let prevPoints: number | null = null;

    return rows.map((r, i) => {
      if (prevPoints === null || r.totalPoints !== prevPoints) {
        currentRank = i + 1;
        prevPoints = r.totalPoints;
      }
      return { ...r, rank: currentRank };
    });
  }, [rows]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ margin: 0 }}>ランキング</h1>
      </div>

      {busy ? <p>読込中...</p> : null}
      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}

      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>順位</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>ID</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>ニックネーム</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>合計</th>
              <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>ver</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((r) => (
              <tr key={r.uid}>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{r.rank}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{r.idNo ?? "-"}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                  <Link href={`/users/${r.uid}`} style={{ color: "inherit", textDecoration: "underline" }}>
                    {r.nickname}
                  </Link>
                </td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{r.totalPoints}</td>
                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{r.scoringVersion ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ color: "#666" }}>
        ※ 同点は同順位扱い（暫定）
      </p>
    </div>
  );
}
