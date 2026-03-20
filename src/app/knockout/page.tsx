"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

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

                  const homeScore = m.status === "FINISHED" && typeof m.homeScore === "number" ? String(m.homeScore) : "-";
                  const awayScore = m.status === "FINISHED" && typeof m.awayScore === "number" ? String(m.awayScore) : "-";

                  return (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "88px 1fr 40px",
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
                        <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 4 }}>
                          <div style={{ fontSize: 14, fontWeight: 800 }}>{homeScore}</div>
                          <div style={{ fontSize: 14, fontWeight: 800 }}>{awayScore}</div>
                        </div>
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
