"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, Timestamp, where } from "firebase/firestore";

import { db } from "@/lib/firebase/client";

type UserDoc = {
  idNo?: number;
  nickname?: string;
  email?: string;
  photoURL?: string | null;
};

type UserStatsDoc = {
  uid: string;
  totalPoints: number;
  scoringVersion?: number;
  updatedAt?: Timestamp;
};

type UserMatchPointsDoc = {
  uid?: string;
  matchId?: string;
  points?: number;
};

type MatchDocLite = {
  kickoffAt?: Timestamp;
  status?: string;
};

type Row = {
  uid: string;
  idNo: number | null;
  nickname: string;
  photoURL: string | null;
  totalPoints: number;
  scoringVersion: number | null;
};

export default function RankingPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRows, setTotalRows] = useState<Row[]>([]);
  const [dailyRows, setDailyRows] = useState<Row[]>([]);
  const [viewMode, setViewMode] = useState<"total" | "daily">("total");
  const [userMap, setUserMap] = useState<Map<string, UserDoc>>(new Map());

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
        setUserMap(userMap);

        const statsQ = query(collection(db, "userStats"), orderBy("totalPoints", "desc"));
        const statsSnap = await getDocs(statsQ);

        const r: Row[] = statsSnap.docs.map((d) => {
          const s = d.data() as UserStatsDoc;
          const u = userMap.get(s.uid);
          return {
            uid: s.uid,
            idNo: typeof u?.idNo === "number" ? u.idNo : null,
            nickname: u?.nickname ?? "(no name)",
            photoURL: typeof u?.photoURL === "string" ? u.photoURL : null,
            totalPoints: typeof s.totalPoints === "number" ? s.totalPoints : 0,
            scoringVersion: typeof s.scoringVersion === "number" ? s.scoringVersion : null,
          };
        });

        setTotalRows(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, []);

  useEffect(() => {
    async function run() {
      if (userMap.size === 0) {
        setDailyRows([]);
        return;
      }
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const startMs = start.getTime();
        const endMs = end.getTime();

        const matchSnap = await getDocs(query(collection(db, "matches"), where("status", "==", "FINISHED")));
        const matchMsById = new Map<string, number>();
        for (const d of matchSnap.docs) {
          const m = d.data() as MatchDocLite;
          const ms = m.kickoffAt?.toMillis?.();
          if (typeof ms === "number") matchMsById.set(d.id, ms);
        }

        const pointsSnap = await getDocs(collection(db, "userMatchPoints"));
        const dailyPointsByUid = new Map<string, number>();
        for (const d of pointsSnap.docs) {
          const p = d.data() as UserMatchPointsDoc;
          if (typeof p.uid !== "string") continue;
          if (typeof p.matchId !== "string") continue;
          if (typeof p.points !== "number") continue;
          const ms = matchMsById.get(p.matchId);
          if (typeof ms !== "number") continue;
          if (ms < startMs || ms >= endMs) continue;
          dailyPointsByUid.set(p.uid, (dailyPointsByUid.get(p.uid) ?? 0) + p.points);
        }

        const rows: Row[] = Array.from(dailyPointsByUid.entries())
          .map(([uid, points]) => {
            const u = userMap.get(uid);
            return {
              uid,
              idNo: typeof u?.idNo === "number" ? u.idNo : null,
              nickname: u?.nickname ?? "(no name)",
              photoURL: typeof u?.photoURL === "string" ? u.photoURL : null,
              totalPoints: points,
              scoringVersion: null,
            };
          })
          .sort((a, b) => b.totalPoints - a.totalPoints);

        setDailyRows(rows);
      } catch {
        setDailyRows([]);
      }
    }
    void run();
  }, [userMap]);

  const ranked = useMemo(() => {
    const rows = viewMode === "daily" ? dailyRows : totalRows;
    let currentRank = 0;
    let prevPoints: number | null = null;

    return rows.map((r, i) => {
      if (prevPoints === null || r.totalPoints !== prevPoints) {
        currentRank = i + 1;
        prevPoints = r.totalPoints;
      }
      return { ...r, rank: currentRank };
    });
  }, [dailyRows, totalRows, viewMode]);

  const rankedTop = ranked.slice(0, 50);

  const top3 = rankedTop.slice(0, 3);
  const rest = rankedTop.slice(3);

  const formatPoints = (n: number) => n.toLocaleString("ja-JP");
  const initial = (name: string) => {
    const s = name.trim();
    if (!s) return "?";
    return s.slice(0, 1).toUpperCase();
  };

  const PodiumUser = (props: { r: (typeof ranked)[number] | undefined; place: 1 | 2 | 3 }) => {
    const r = props.r;
    const icon = props.place === 1 ? "🏆" : props.place === 2 ? "🥈" : "🥉";
    const iconColor = props.place === 1 ? "#fbbf24" : props.place === 2 ? "#e5e7eb" : "#fb923c";
    const ringColor = props.place === 1 ? "rgba(251, 191, 36, 0.85)" : props.place === 2 ? "rgba(229, 231, 235, 0.85)" : "rgba(251, 146, 60, 0.85)";
    const avatarSize = props.place === 1 ? 78 : 64;
    const pointSize = props.place === 1 ? 22 : 18;
    const nameSize = props.place === 1 ? 14 : 13;
    const pedestalH = props.place === 1 ? 86 : props.place === 2 ? 70 : 62;
    const iconSize = props.place === 1 ? 30 : 26;

    return (
      <div style={{ display: "grid", justifyItems: "center", gap: 10, width: "100%" }}>
        <div style={{ position: "relative", width: avatarSize, height: avatarSize }}>
          <div
            style={{
              width: avatarSize,
              height: avatarSize,
              borderRadius: 999,
              background: "rgba(255,255,255,0.25)",
              border: `3px solid ${ringColor}`,
              boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
              display: "grid",
              placeItems: "center",
              color: "rgba(255,255,255,0.95)",
              fontWeight: 900,
              fontSize: props.place === 1 ? 30 : 26,
              letterSpacing: 0.4,
              overflow: "hidden",
            }}
          >
            {r ? (
              <Link href={`/users/${r.uid}`} style={{ color: "inherit", textDecoration: "none", width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                {r.photoURL ? (
                  <img src={r.photoURL} alt="" width={avatarSize} height={avatarSize} style={{ width: avatarSize, height: avatarSize, objectFit: "cover" }} />
                ) : (
                  initial(r.nickname)
                )}
              </Link>
            ) : (
              "-"
            )}
          </div>
          <div
            style={{
              position: "absolute",
              top: -20,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: iconSize,
              filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.25))",
              color: iconColor,
            }}
          >
            {icon}
          </div>
        </div>

        <div style={{ display: "grid", justifyItems: "center", gap: 4, minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: nameSize, color: "rgba(255,255,255,0.95)", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r ? r.nickname : "-"}
          </div>
          <div style={{ fontWeight: 900, fontSize: pointSize, color: "rgba(255,255,255,0.95)", display: "inline-flex", alignItems: "baseline", gap: 6 }}>
            {r ? (
              <>
                <span>{formatPoints(r.totalPoints)}</span>
                <span style={{ fontSize: Math.max(10, Math.round(pointSize * 0.62)), opacity: 0.85 }}>Pts</span>
              </>
            ) : (
              "-"
            )}
          </div>
        </div>

        <div
          style={{
            width: "100%",
            height: pedestalH,
            borderRadius: 16,
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.95)", letterSpacing: 0.3 }}>
            {props.place}位
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "12px 16px 24px",
        background: "linear-gradient(135deg, #040913 0%, #0b1f3a 45%, #2b1d5f 100%)",
        color: "#fff",
        position: "relative",
        display: "grid",
        justifyItems: "center",
        alignContent: "start",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.14), transparent 46%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", width: "min(520px, 100%)", display: "grid", gap: 10 }}>
        {busy ? <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 900 }}>読込中...</div> : null}
        {error ? <pre style={{ color: "#fff", whiteSpace: "pre-wrap", margin: 0 }}>{error}</pre> : null}

        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <button
              onClick={() => setViewMode("total")}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                border: "1px solid rgba(255,255,255,0.16)",
                background: viewMode === "total" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.96)",
                fontWeight: 900,
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              大会通算
            </button>
            <button
              onClick={() => setViewMode("daily")}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                border: "1px solid rgba(255,255,255,0.16)",
                background: viewMode === "daily" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.96)",
                fontWeight: 900,
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              デイリー
            </button>
          </div>
        </div>

        <div style={{ paddingTop: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr 1fr", alignItems: "end", gap: 12 }}>
            <PodiumUser r={top3[1]} place={2} />
            <PodiumUser r={top3[0]} place={1} />
            <PodiumUser r={top3[2]} place={3} />
          </div>
        </div>

        <div
          style={{
            marginTop: 8,
            background: "rgba(255,255,255,0.96)",
            borderRadius: 18,
            overflow: "hidden",
            boxShadow: "0 18px 40px rgba(0,0,0,0.18)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ padding: "12px 14px", display: "grid", gap: 0 }}>
            <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.70)", fontSize: 12, letterSpacing: 0.4 }}>RANKING</div>
          </div>

          <div style={{ display: "grid" }}>
            {rest.map((r) => (
              <div
                key={r.uid}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 42px 1fr auto",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.60)", textAlign: "center" }}>{r.rank}</div>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.08)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                    color: "rgba(0,0,0,0.75)",
                    overflow: "hidden",
                  }}
                >
                  <Link href={`/users/${r.uid}`} style={{ color: "inherit", textDecoration: "none", width: "100%", height: "100%", display: "grid", placeItems: "center" }}>
                    {r.photoURL ? (
                      <img src={r.photoURL} alt="" width={34} height={34} style={{ width: 34, height: 34, objectFit: "cover" }} />
                    ) : (
                      initial(r.nickname)
                    )}
                  </Link>
                </div>

                <div style={{ minWidth: 0 }}>
                  <Link
                    href={`/users/${r.uid}`}
                    style={{
                      color: "rgba(0,0,0,0.85)",
                      textDecoration: "none",
                      fontWeight: 900,
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.nickname}
                  </Link>
                  <div style={{ fontSize: 11, fontWeight: 900, color: "rgba(0,0,0,0.45)", marginTop: 2 }}>{r.idNo ?? "-"}</div>
                </div>

                <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.75)", textAlign: "right", display: "inline-flex", alignItems: "baseline", gap: 6 }}>
                  <span>{formatPoints(r.totalPoints)}</span>
                  <span style={{ fontSize: 10, opacity: 0.85 }}>Pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: "rgba(255,255,255,0.92)", fontWeight: 900, fontSize: 12 }}>
          ※ 同点は同順位扱い（暫定）
        </div>
      </div>
    </div>
  );
}
