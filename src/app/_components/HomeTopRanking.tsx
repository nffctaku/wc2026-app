"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";

type UserStatsDoc = {
  uid?: string;
  totalPoints?: number;
};

type PublicUserDoc = {
  idNo?: number;
  nickname?: string;
  photoURL?: string | null;
};

type Row = {
  uid: string;
  rank: number;
  nickname: string;
  photoURL: string | null;
  totalPoints: number;
};

type Slot = {
  rank: number;
  row: Row | null;
};

function formatPoints(n: number): string {
  return n.toLocaleString("ja-JP");
}

function initial(name: string): string {
  const s = name.trim();
  if (!s) return "?";
  return s.slice(0, 1).toUpperCase();
}

function rankColor(rank: number): string {
  if (rank === 1) return "#f4c542";
  if (rank === 2) return "#c0c0c0";
  if (rank === 3) return "#cd7f32";
  if (rank >= 5 && rank <= 10) return "#9aa0a6";
  return "rgba(0,0,0,0.55)";
}

export default function HomeTopRanking(props: { limit?: number }) {
  const topN = typeof props.limit === "number" ? props.limit : 10;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    async function run() {
      setBusy(true);
      setError(null);
      try {
        const q = query(collection(db, "userStats"), orderBy("totalPoints", "desc"), limit(topN));
        const snap = await getDocs(q);

        const base = snap.docs
          .map((d) => d.data() as UserStatsDoc)
          .map((s, i) => {
            const uid = typeof s.uid === "string" ? s.uid : null;
            const pts = typeof s.totalPoints === "number" ? s.totalPoints : 0;
            return uid ? { uid, rank: i + 1, totalPoints: pts } : null;
          })
          .filter((x): x is { uid: string; rank: number; totalPoints: number } => Boolean(x));

        const publicSnaps = await Promise.all(base.map((b) => getDoc(doc(db, "publicUsers", b.uid))));

        const merged: Row[] = base.map((b, idx) => {
          const s = publicSnaps[idx];
          const u = (s?.exists() ? (s.data() as PublicUserDoc) : null) as PublicUserDoc | null;
          return {
            uid: b.uid,
            rank: b.rank,
            nickname: u?.nickname?.trim() ? String(u.nickname) : "(no name)",
            photoURL: typeof u?.photoURL === "string" ? u.photoURL : null,
            totalPoints: b.totalPoints,
          };
        });

        setRows(merged);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setRows([]);
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, [topN]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.96)" }}>ランキング TOP{topN}</div>
        <Link href="/ranking" style={{ fontWeight: 900, fontSize: 12, color: "rgba(255,255,255,0.80)", textDecoration: "none" }}>
          全体を見る
        </Link>
      </div>

      {busy ? <div style={{ fontWeight: 800, color: "rgba(0,0,0,0.55)" }}>読込中...</div> : null}
      {error ? <div style={{ fontWeight: 800, color: "#b00020", whiteSpace: "pre-wrap" }}>{error}</div> : null}

      <div style={{ display: "grid", gap: 8 }}>
        {Array.from({ length: topN }).map((_, i) => {
          const rank = i + 1;
          const r = rows[i] ?? null;
          const shellStyle: React.CSSProperties = {
            display: "grid",
            gridTemplateColumns: "36px 38px 1fr auto",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(0,0,0,0.08)",
            background: "rgba(255,255,255,0.92)",
            textDecoration: "none",
            color: "inherit",
          };

          const body = (
            <>
              <div style={{ fontWeight: 900, color: rankColor(rank), textAlign: "center" }}>{rank}</div>

              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.08)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 900,
                  color: "rgba(0,0,0,0.75)",
                }}
              >
                {r?.photoURL ? (
                  <img src={r.photoURL} alt="" width={32} height={32} style={{ width: 32, height: 32, objectFit: "cover" }} />
                ) : r ? (
                  initial(r.nickname)
                ) : (
                  ""
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r ? r.nickname : ""}
                </div>
              </div>

              <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.75)", textAlign: "right", display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                {r ? (
                  <>
                    <span>{formatPoints(r.totalPoints)}</span>
                    <span style={{ fontSize: 10, opacity: 0.85 }}>Pts</span>
                  </>
                ) : (
                  <span style={{ opacity: 0.25 }}>&nbsp;</span>
                )}
              </div>
            </>
          );

          return r ? (
            <Link key={r.uid} href={`/users/${r.uid}`} style={shellStyle}>
              {body}
            </Link>
          ) : (
            <div key={`slot_${rank}`} style={shellStyle} aria-hidden="true">
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
