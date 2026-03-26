"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
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

type DayGroup = {
  dayKey: string;
  label: string;
  weekday: number; // 0=Sun ... 6=Sat
  matches: MatchRow[];
};

function formatTime(ts: Timestamp): string {
  const d = ts.toDate();
  return d.toLocaleString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayLabel(dayKey: string, weekday: number): string {
  const wd = ["日", "月", "火", "水", "木", "金", "土"][weekday] ?? "";
  return `${dayKey}(${wd})`;
}

function localFlagSrc(team: TeamDoc | undefined): string | null {
  const code = team?.code?.trim();
  if (!code) return null;
  return `/国旗/${code.toUpperCase()}.png`;
}

function dayKeyJst(ts: Timestamp): { dayKey: string; weekday: number } {
  const d = ts.toDate();
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(d);

  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  const weekdayText = parts.find((p) => p.type === "weekday")?.value ?? "";

  const dayKey = `${year}/${month}/${day}`;
  const weekday = weekdayText.includes("日")
    ? 0
    : weekdayText.includes("月")
      ? 1
      : weekdayText.includes("火")
        ? 2
        : weekdayText.includes("水")
          ? 3
          : weekdayText.includes("木")
            ? 4
            : weekdayText.includes("金")
              ? 5
              : weekdayText.includes("土")
                ? 6
                : 0;

  return { dayKey, weekday };
}

export default function SchedulePage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teams, setTeams] = useState<Map<string, TeamDoc>>(new Map());
  const [uid, setUid] = useState<string | null>(null);
  const [predictionByMatchId, setPredictionByMatchId] = useState<Map<string, { homeScore: number; awayScore: number }>>(
    new Map(),
  );
  const [selectedDayKey, setSelectedDayKey] = useState<string>("");

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
        setPredictionByMatchId(new Map());
        return;
      }

      try {
        const predSnap = await getDocs(query(collection(db, "predictions"), where("uid", "==", uid)));
        const m = new Map<string, { homeScore: number; awayScore: number }>();
        for (const d of predSnap.docs) {
          const data = d.data() as { matchId?: string; homeScore?: number; awayScore?: number };
          if (typeof data.matchId === "string" && typeof data.homeScore === "number" && typeof data.awayScore === "number") {
            m.set(data.matchId, { homeScore: data.homeScore, awayScore: data.awayScore });
          }
        }
        setPredictionByMatchId(m);
      } catch {
        setPredictionByMatchId(new Map());
      }
    }

    void run();
  }, [uid]);

  const dayGroups = useMemo((): DayGroup[] => {
    const map = new Map<string, { weekday: number; matches: MatchRow[] }>();

    for (const m of matches) {
      const { dayKey, weekday } = dayKeyJst(m.kickoffAt);
      if (!map.has(dayKey)) map.set(dayKey, { weekday, matches: [] });
      map.get(dayKey)!.matches.push(m);
    }

    const list: DayGroup[] = Array.from(map.entries()).map(([dayKey, v]) => {
      const ms = v.matches.slice();
      ms.sort((a, b) => a.kickoffAt.toMillis() - b.kickoffAt.toMillis());
      return {
        dayKey,
        weekday: v.weekday,
        label: formatDayLabel(dayKey, v.weekday),
        matches: ms,
      };
    });

    list.sort((a, b) => {
      const ams = a.matches[0]?.kickoffAt.toMillis() ?? 0;
      const bms = b.matches[0]?.kickoffAt.toMillis() ?? 0;
      return ams - bms;
    });

    return list;
  }, [matches]);

  useEffect(() => {
    if (dayGroups.length === 0) {
      setSelectedDayKey("");
      return;
    }
    const exists = dayGroups.some((g) => g.dayKey === selectedDayKey);
    if (!exists) setSelectedDayKey(dayGroups[0]!.dayKey);
  }, [dayGroups, selectedDayKey]);

  const selectedGroup = useMemo(() => {
    if (!selectedDayKey) return null;
    return dayGroups.find((g) => g.dayKey === selectedDayKey) ?? null;
  }, [dayGroups, selectedDayKey]);

  function dayTabStyle(weekday: number, active: boolean): CSSProperties {
    const isSat = weekday === 6;
    const isSun = weekday === 0;

    const accent = isSat ? "#0078D4" : isSun ? "#d83b01" : null;

    if (active && accent) {
      return {
        appearance: "none",
        WebkitAppearance: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 34,
        lineHeight: "34px",
        width: "auto",
        border: `1px solid ${accent}`,
        background: accent,
        color: "#fff",
        borderRadius: 999,
        padding: "8px 12px",
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
        cursor: "pointer",
        flex: "0 0 auto",
      };
    }

    return {
      appearance: "none",
      WebkitAppearance: "none",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      height: 34,
      lineHeight: "34px",
      width: "auto",
      border: active ? "1px solid rgba(255,255,255,0.26)" : "1px solid rgba(255,255,255,0.14)",
      background: active ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)",
      color: active ? "rgba(255,255,255,0.96)" : "rgba(255,255,255,0.82)",
      borderRadius: 999,
      padding: "8px 12px",
      fontWeight: 900,
      fontSize: 12,
      whiteSpace: "nowrap",
      cursor: "pointer",
      flex: "0 0 auto",
    };
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #040913 0%, #0b1f3a 45%, #2b1d5f 100%)",
        color: "#fff",
        position: "relative",
        padding: 24,
        display: "grid",
        alignContent: "start",
        gap: 12,
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

      <div style={{ position: "relative", display: "grid", alignContent: "start", gap: 12 }}>
        {busy ? <p>読込中...</p> : null}
        {error ? <pre style={{ color: "#ffb4ab" }}>{error}</pre> : null}

        {!busy && !error ? (
          <div style={{ display: "grid", alignContent: "start", gap: 10 }}>
            {dayGroups.length === 0 ? <p>データがありません</p> : null}

            {dayGroups.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  overflowX: "auto",
                  paddingBottom: 2,
                  alignItems: "center",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {dayGroups.map((g) => {
                  const active = g.dayKey === selectedDayKey;
                  return (
                    <button key={g.dayKey} onClick={() => setSelectedDayKey(g.dayKey)} style={dayTabStyle(g.weekday, active)}>
                      {g.label}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {selectedGroup ? (
              <section style={{ display: "grid", gap: 10, paddingTop: 2 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  {selectedGroup.matches.map((m) => {
                    const homeTeam = teams.get(m.homeTeamId);
                    const awayTeam = teams.get(m.awayTeamId);

                    const homeName = homeTeam?.nameJa ?? m.homeTeamId;
                    const awayName = awayTeam?.nameJa ?? m.awayTeamId;

                    const homeFlag = localFlagSrc(homeTeam);
                    const awayFlag = localFlagSrc(awayTeam);

                    const pred = predictionByMatchId.get(m.id);

                    return (
                      <Link
                        key={m.id}
                        href={`/matches/${m.id}`}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "64px 1fr 92px",
                          gap: 10,
                          alignItems: "center",
                          padding: "10px 12px",
                          borderRadius: 12,
                          border: "1px solid rgba(255,255,255,0.14)",
                          background: "rgba(255,255,255,0.06)",
                          color: "inherit",
                          textDecoration: "none",
                        }}
                      >
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.72)" }}>{formatTime(m.kickoffAt)}</div>

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
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{homeName}</span>
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
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{awayName}</span>
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "rgba(255,255,255,0.62)",
                              marginTop: 4,
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {m.cityNameJa} / {m.stadiumNameJa}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {pred ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "6px 10px",
                                borderRadius: 999,
                                border: "1px solid rgba(255,255,255,0.18)",
                                background: "#0078D4",
                                fontSize: 12,
                                fontWeight: 900,
                                color: "#fff",
                                whiteSpace: "nowrap",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {pred.homeScore}-{pred.awayScore}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "6px 10px",
                                borderRadius: 999,
                                border: "1px solid rgba(255,255,255,0.14)",
                                background: "rgba(224,106,0,0.95)",
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
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
