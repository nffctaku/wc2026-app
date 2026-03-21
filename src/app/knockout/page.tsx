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
import { subscribeAuth } from "@/lib/firebase/auth";

type MatchRow = MatchDoc & { id: string };

type StageGroup = {
  stageNameJa: string;
  matches: MatchRow[];
};

function normalizeStageNameJa(stageNameJa: string): string {
  const s = stageNameJa.trim();
  if (!s) return s;

  if (/(^|\D)3\s*位/.test(s) || s.includes("三位") || s.includes("3位")) return "3位決定戦";
  return s.replaceAll("プレーオフ", "").trim();
}

function stageOrder(stageNameJa: string): number {
  const s = normalizeStageNameJa(stageNameJa);

  if (s.includes("32")) return 10;
  if (s.includes("16")) return 20;
  if (s.includes("準々")) return 30;
  if (s.includes("準決")) return 40;
  if (s.includes("3位") || s.includes("三位")) return 50;
  if (s === "決勝" || s.endsWith("決勝")) return 60;

  return 999;
}

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

function localFlagSrc(team: TeamDoc | undefined): string | null {
  const code = team?.code?.trim();
  if (!code) return null;
  return `/国旗/${code.toUpperCase()}.png`;
}

function isGroupStage(m: MatchRow): boolean {
  const g = m.groupNameJa?.trim();
  if (g) return true;
  const s = m.stageNameJa?.trim();
  if (s && s.includes("グループ")) return true;
  return false;
}

export default function KnockoutPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teams, setTeams] = useState<Map<string, TeamDoc>>(new Map());
  const [uid, setUid] = useState<string | null>(null);
  const [pointsByMatchId, setPointsByMatchId] = useState<Map<string, number>>(new Map());

  function pointsBadge(points: number) {
    const value = points >= 50 ? 50 : points >= 20 ? 20 : 0;
    const bg = value >= 50 ? "#f4c542" : value >= 20 ? "#49e21c" : "#9aa0a6";
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 34,
          height: 34,
          borderRadius: 999,
          background: bg,
          color: "#fff",
          fontWeight: 900,
          fontSize: 14,
          lineHeight: 1,
          textShadow: "0 1px 1px rgba(0,0,0,0.30)",
          flex: "0 0 auto",
        }}
      >
        {value}
      </span>
    );
  }

  useEffect(() => {
    return subscribeAuth((u) => setUid(u?.uid ?? null));
  }, []);

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

        const q = query(collection(db, "matches"), orderBy("kickoffAt", "asc"));
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

  useEffect(() => {
    async function run() {
      if (!uid) {
        setPointsByMatchId(new Map());
        return;
      }
      try {
        const q = query(collection(db, "userMatchPoints"), where("uid", "==", uid));
        const snap = await getDocs(q);
        const m = new Map<string, number>();
        for (const d of snap.docs) {
          const data = d.data() as { matchId?: string; points?: number };
          if (typeof data.matchId === "string" && typeof data.points === "number") {
            m.set(data.matchId, data.points);
          }
        }
        setPointsByMatchId(m);
      } catch {
        setPointsByMatchId(new Map());
      }
    }

    void run();
  }, [uid]);

  const stageGroups = useMemo((): StageGroup[] => {
    const knockout = matches.filter((m) => !isGroupStage(m));
    const map = new Map<string, MatchRow[]>();

    for (const m of knockout) {
      const raw = m.stageNameJa?.trim() ? m.stageNameJa.trim() : "決勝トーナメント";
      const key = normalizeStageNameJa(raw);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }

    const list: StageGroup[] = Array.from(map.entries()).map(([stageNameJa, ms]) => {
      ms.sort((a, b) => a.kickoffAt.toMillis() - b.kickoffAt.toMillis());
      return { stageNameJa, matches: ms };
    });

    list.sort((a, b) => {
      const ao = stageOrder(a.stageNameJa);
      const bo = stageOrder(b.stageNameJa);
      if (ao !== bo) return ao - bo;
      return a.stageNameJa.localeCompare(b.stageNameJa, "ja");
    });
    return list;
  }, [matches]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ margin: 0 }}>決勝トーナメント</h1>
      </div>

      {busy ? <p>読込中...</p> : null}
      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}

      {!busy && !error ? (
        <div style={{ display: "grid", gap: 16 }}>
          {stageGroups.length === 0 ? <p>データがありません</p> : null}
          {stageGroups.map((g) => (
            <section key={g.stageNameJa} style={{ display: "grid", gap: 10 }}>
              <h2 style={{ margin: 0 }}>{g.stageNameJa}</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {g.matches.map((m) => {
                  const homeTeam = teams.get(m.homeTeamId);
                  const awayTeam = teams.get(m.awayTeamId);

                  const homeName = homeTeam?.nameJa ?? m.homeTeamId;
                  const awayName = awayTeam?.nameJa ?? m.awayTeamId;

                  const homeFlag = localFlagSrc(homeTeam);
                  const awayFlag = localFlagSrc(awayTeam);

                  const hasScore =
                    m.status === "FINISHED" && typeof m.homeScore === "number" && typeof m.awayScore === "number";
                  const homeScore = hasScore ? String(m.homeScore) : "-";
                  const awayScore = hasScore ? String(m.awayScore) : "-";
                  const scoreText = hasScore ? `${homeScore}-${awayScore}` : "-";
                  const points = pointsByMatchId.get(m.id);
                  const showPoints = hasScore && typeof points === "number";

                  return (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "88px 1fr 92px",
                        gap: 10,
                        alignItems: "center",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.10)",
                        background: "rgba(0,0,0,0.02)",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.65)" }}>{formatTs(m.kickoffAt)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 4 }}>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                            title={homeName}
                          >
                            {homeFlag ? (
                              <img
                                src={homeFlag}
                                alt=""
                                width={18}
                                height={12}
                                style={{
                                  width: 18,
                                  height: 12,
                                  objectFit: "cover",
                                  borderRadius: 2,
                                  flex: "0 0 auto",
                                }}
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : null}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {homeName}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 700,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                            title={awayName}
                          >
                            {awayFlag ? (
                              <img
                                src={awayFlag}
                                alt=""
                                width={18}
                                height={12}
                                style={{
                                  width: 18,
                                  height: 12,
                                  objectFit: "cover",
                                  borderRadius: 2,
                                  flex: "0 0 auto",
                                }}
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : null}
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {awayName}
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", marginTop: 4 }}>
                          {m.cityNameJa} / {m.stadiumNameJa}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {hasScore ? (
                          <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 16, fontWeight: 900 }}>{scoreText}</span>
                            {showPoints ? pointsBadge(points) : null}
                          </div>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "6px 10px",
                              borderRadius: 999,
                              border: "1px solid rgba(0,0,0,0.10)",
                              background: "#ff9f1c",
                              fontSize: 12,
                              fontWeight: 800,
                              color: "#fff",
                              whiteSpace: "nowrap",
                            }}
                          >
                            予想する
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
