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

type FormMark = "W" | "D" | "L";

type TeamStanding = {
  teamId: string;
  teamLabel: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
  form: FormMark[];
};

type GroupStanding = {
  groupNameJa: string;
  teams: TeamStanding[];
};

type ThirdPlaceRow = {
  groupNameJa: string;
  team: TeamStanding;
};

function proxiedFlagUrl(raw: string): string {
  return `/api/flag?url=${encodeURIComponent(raw)}`;
}

function toGroupLetter(groupNameJa: string): string {
  const m = groupNameJa.match(/[A-Z]/);
  return m ? m[0] : groupNameJa;
}

function formatScore(m: MatchRow): string {
  if (m.status !== "FINISHED") return "-";
  if (typeof m.homeScore !== "number" || typeof m.awayScore !== "number") return "-";
  return `${m.homeScore}-${m.awayScore}`;
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

function upsertTeam(
  map: Map<string, TeamStanding>,
  teamId: string,
  teamLabel: string
): TeamStanding {
  const existing = map.get(teamId);
  if (existing) return existing;
  const t: TeamStanding = {
    teamId,
    teamLabel,
    played: 0,
    win: 0,
    draw: 0,
    loss: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    pts: 0,
    form: [],
  };
  map.set(teamId, t);
  return t;
}

function computeStandings(matches: MatchRow[], teamsById: Map<string, TeamDoc>): GroupStanding[] {
  const groupTeams = new Map<string, Map<string, TeamStanding>>();

  const pushForm = (t: TeamStanding, mark: FormMark) => {
    t.form.push(mark);
    if (t.form.length > 5) t.form.length = 5;
  };

  for (const m of matches) {
    const group = m.groupNameJa && m.groupNameJa.trim() ? m.groupNameJa.trim() : "グループ未定";
    if (!groupTeams.has(group)) groupTeams.set(group, new Map());

    const teamMap = groupTeams.get(group)!;
    const homeDoc = teamsById.get(m.homeTeamId);
    const awayDoc = teamsById.get(m.awayTeamId);

    const homeLabel = homeDoc?.code ?? homeDoc?.nameJa ?? m.homeTeamId;
    const awayLabel = awayDoc?.code ?? awayDoc?.nameJa ?? m.awayTeamId;

    const home = upsertTeam(teamMap, m.homeTeamId, homeLabel);
    const away = upsertTeam(teamMap, m.awayTeamId, awayLabel);

    if (m.status !== "FINISHED") continue;
    if (typeof m.homeScore !== "number" || typeof m.awayScore !== "number") continue;

    home.played += 1;
    away.played += 1;

    home.gf += m.homeScore;
    home.ga += m.awayScore;
    away.gf += m.awayScore;
    away.ga += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.win += 1;
      home.pts += 3;
      away.loss += 1;

      pushForm(home, "W");
      pushForm(away, "L");
    } else if (m.homeScore < m.awayScore) {
      away.win += 1;
      away.pts += 3;
      home.loss += 1;

      pushForm(home, "L");
      pushForm(away, "W");
    } else {
      home.draw += 1;
      away.draw += 1;
      home.pts += 1;
      away.pts += 1;

      pushForm(home, "D");
      pushForm(away, "D");
    }
  }

  const groups: GroupStanding[] = Array.from(groupTeams.entries()).map(([groupNameJa, teamMap]) => {
    const teams = Array.from(teamMap.values())
      .map((t) => ({ ...t, gd: t.gf - t.ga }))
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.gd !== a.gd) return b.gd - a.gd;
        if (b.gf !== a.gf) return b.gf - a.gf;
        return a.teamLabel.localeCompare(b.teamLabel, "ja");
      });

    return { groupNameJa, teams };
  });

  groups.sort((a, b) => a.groupNameJa.localeCompare(b.groupNameJa, "ja"));
  return groups;
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

        const q = query(collection(db, "matches"), orderBy("kickoffAt", "desc"));
        const matchSnap = await getDocs(q);
        const rows: MatchRow[] = matchSnap.docs
          .map((d) => ({
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
    return matches
      .filter((m) => m.status === "FINISHED")
      .map((m) => {
      const home = teams.get(m.homeTeamId)?.nameJa ?? m.homeTeamId;
      const away = teams.get(m.awayTeamId)?.nameJa ?? m.awayTeamId;
      return {
        ...m,
        homeName: home,
        awayName: away,
      };
    });
  }, [matches, teams]);

  const finishedCount = useMemo(() => {
    return matches.filter((m) => m.status === "FINISHED").length;
  }, [matches]);

  const standingsGroups = useMemo(() => {
    return computeStandings(matches, teams);
  }, [matches, teams]);

  const displayStandingsGroups = useMemo(() => {
    return standingsGroups.filter((g) => g.groupNameJa !== "グループ未定");
  }, [standingsGroups]);

  const thirdPlaceRanking = useMemo(() => {
    const rows: ThirdPlaceRow[] = [];

    for (const g of standingsGroups) {
      if (g.groupNameJa === "グループ未定") continue;
      const third = g.teams[2];
      if (!third) continue;
      rows.push({ groupNameJa: g.groupNameJa, team: third });
    }

    rows.sort((a, b) => {
      if (b.team.pts !== a.team.pts) return b.team.pts - a.team.pts;
      if (b.team.gd !== a.team.gd) return b.team.gd - a.team.gd;
      if (b.team.gf !== a.team.gf) return b.team.gf - a.team.gf;
      return a.team.teamLabel.localeCompare(b.team.teamLabel, "ja");
    });

    return rows;
  }, [standingsGroups]);

  const groupMatches = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const m of matches) {
      const group = m.groupNameJa && m.groupNameJa.trim() ? m.groupNameJa.trim() : "グループ未定";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(m);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => a.kickoffAt.toMillis() - b.kickoffAt.toMillis());
      map.set(k, list);
    }
    return map;
  }, [matches]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ margin: 0 }}>大会結果</h1>
      </div>

      <p>{busy ? "読込中..." : `Finished: ${finishedCount}`}</p>
      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}

      <section style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>順位表</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {displayStandingsGroups.map((g) => (
            <div
              key={g.groupNameJa}
              style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  fontWeight: 700,
                  borderBottom: "1px solid #eee",
                  background: "rgba(0,0,0,0.02)",
                }}
              >
                {g.groupNameJa}
              </div>
              <div>
                <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          width: 36,
                          textAlign: "left",
                          padding: "6px 6px",
                          borderBottom: "1px solid #eee",
                          fontSize: 12,
                        }}
                      >
                        順
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px 6px",
                          borderBottom: "1px solid #eee",
                          fontSize: 12,
                        }}
                      >
                        チーム
                      </th>
                      <th
                        style={{
                          width: 40,
                          textAlign: "right",
                          padding: "6px 6px",
                          borderBottom: "1px solid #eee",
                          fontSize: 12,
                        }}
                      >
                        P
                      </th>
                      <th
                        style={{
                          width: 52,
                          textAlign: "right",
                          padding: "6px 6px",
                          borderBottom: "1px solid #eee",
                          fontSize: 12,
                        }}
                      >
                        得失
                      </th>
                      <th
                        style={{
                          width: 54,
                          textAlign: "right",
                          padding: "6px 6px",
                          borderBottom: "1px solid #eee",
                          fontSize: 12,
                        }}
                      >
                        勝点
                      </th>
                      <th
                        style={{
                          width: 92,
                          textAlign: "left",
                          padding: "6px 6px",
                          borderBottom: "1px solid #eee",
                          fontSize: 12,
                        }}
                      >
                        form
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.teams.map((t, idx) => (
                      <tr key={t.teamId}>
                        <td style={{ padding: "6px 6px", borderBottom: "1px solid #f2f2f2", fontSize: 13 }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "6px 6px", borderBottom: "1px solid #f2f2f2" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                            {teams.get(t.teamId)?.flagUrl ? (
                              <img
                                src={proxiedFlagUrl(teams.get(t.teamId)!.flagUrl!)}
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
                                referrerPolicy="no-referrer"
                              />
                            ) : null}
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={t.teamLabel}
                            >
                              {t.teamLabel}
                            </div>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "6px 6px",
                            borderBottom: "1px solid #f2f2f2",
                            textAlign: "right",
                            fontSize: 13,
                          }}
                        >
                          {t.played}
                        </td>
                        <td
                          style={{
                            padding: "6px 6px",
                            borderBottom: "1px solid #f2f2f2",
                            textAlign: "right",
                            fontSize: 13,
                          }}
                        >
                          {t.gd}
                        </td>
                        <td
                          style={{
                            padding: "6px 6px",
                            borderBottom: "1px solid #f2f2f2",
                            textAlign: "right",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {t.pts}
                        </td>
                        <td style={{ padding: "6px 6px", borderBottom: "1px solid #f2f2f2" }}>
                          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                            {t.form.length ? (
                              t.form.map((m, i) => {
                                const bg = m === "W" ? "#178a2a" : m === "D" ? "#9aa0a6" : "#d93025";
                                return (
                                  <span
                                    key={`${t.teamId}_${i}`}
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 999,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: "#fff",
                                      background: bg,
                                    }}
                                  >
                                    {m}
                                  </span>
                                );
                              })
                            ) : (
                              <span style={{ color: "rgba(0,0,0,0.5)", fontSize: 12 }}>-</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ borderTop: "1px solid #eee" }}>
                <details style={{ padding: "10px 12px" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                    対戦カード（タップで表示）
                  </summary>
                  <div style={{ height: 10 }} />
                  <div style={{ display: "grid", gap: 10 }}>
                    {(groupMatches.get(g.groupNameJa) ?? []).map((m) => {
                      const home = teams.get(m.homeTeamId)?.nameJa ?? m.homeTeamId;
                      const away = teams.get(m.awayTeamId)?.nameJa ?? m.awayTeamId;
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
                          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.65)" }}>
                            {formatTs(m.kickoffAt)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 4 }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={home}
                              >
                                {home}
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={away}
                              >
                                {away}
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 4 }}>
                              <div style={{ fontSize: 14, fontWeight: 800 }}>
                                {m.status === "FINISHED" && typeof m.homeScore === "number" ? m.homeScore : "-"}
                              </div>
                              <div style={{ fontSize: 14, fontWeight: 800 }}>
                                {m.status === "FINISHED" && typeof m.awayScore === "number" ? m.awayScore : "-"}
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </details>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ display: "grid", gap: 10 }}>
        <h2 style={{ margin: 0 }}>3位チーム順位（上位8が決勝ラウンド進出）</h2>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
          <div>
            <table style={{ borderCollapse: "collapse", width: "100%", tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th
                    style={{
                      width: 44,
                      textAlign: "left",
                      padding: "6px 6px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                    }}
                  >
                    順位
                  </th>
                  <th
                    style={{
                      width: 32,
                      textAlign: "left",
                      padding: "6px 6px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                    }}
                  >
                    G
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "6px 6px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                    }}
                  >
                    チーム
                  </th>
                  <th
                    style={{
                      width: 40,
                      textAlign: "right",
                      padding: "6px 6px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                    }}
                  >
                    P
                  </th>
                  <th
                    style={{
                      width: 52,
                      textAlign: "right",
                      padding: "6px 6px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                    }}
                  >
                    得失
                  </th>
                  <th
                    style={{
                      width: 54,
                      textAlign: "right",
                      padding: "6px 6px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                    }}
                  >
                    勝点
                  </th>
                  <th
                    style={{
                      width: 92,
                      textAlign: "left",
                      padding: "6px 6px",
                      borderBottom: "1px solid #eee",
                      fontSize: 12,
                    }}
                  >
                    form
                  </th>
                </tr>
              </thead>
              <tbody>
                {thirdPlaceRanking.map((r, idx) => {
                  const inTop8 = idx < 8;
                  return (
                    <tr
                      key={`${r.groupNameJa}_${r.team.teamId}`}
                      style={{ background: inTop8 ? "rgba(23,138,42,0.10)" : undefined }}
                    >
                      <td
                        style={{
                          padding: "6px 6px",
                          borderBottom: "1px solid #f2f2f2",
                          fontSize: 13,
                          fontWeight: inTop8 ? 700 : 400,
                        }}
                      >
                        {idx + 1}
                      </td>
                      <td style={{ padding: "6px 6px", borderBottom: "1px solid #f2f2f2", fontSize: 13 }}>
                        {toGroupLetter(r.groupNameJa)}
                      </td>
                      <td style={{ padding: "6px 6px", borderBottom: "1px solid #f2f2f2" }}>
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}
                        >
                          {teams.get(r.team.teamId)?.flagUrl ? (
                            <img
                              src={proxiedFlagUrl(teams.get(r.team.teamId)!.flagUrl!)}
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
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={r.team.teamLabel}
                          >
                            {r.team.teamLabel}
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          borderBottom: "1px solid #f2f2f2",
                          textAlign: "right",
                          fontSize: 13,
                        }}
                      >
                        {r.team.played}
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          borderBottom: "1px solid #f2f2f2",
                          textAlign: "right",
                          fontSize: 13,
                        }}
                      >
                        {r.team.gd}
                      </td>
                      <td
                        style={{
                          padding: "6px 6px",
                          borderBottom: "1px solid #f2f2f2",
                          textAlign: "right",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {r.team.pts}
                      </td>
                      <td style={{ padding: "6px 6px", borderBottom: "1px solid #f2f2f2" }}>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          {r.team.form.length ? (
                            r.team.form.map((m, i) => {
                              const bg = m === "W" ? "#178a2a" : m === "D" ? "#9aa0a6" : "#d93025";
                              return (
                                <span
                                  key={`${r.team.teamId}_${i}`}
                                  style={{
                                    width: 18,
                                    height: 18,
                                    borderRadius: 999,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "#fff",
                                    background: bg,
                                  }}
                                >
                                  {m}
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ color: "rgba(0,0,0,0.5)", fontSize: 12 }}>-</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <details style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>試合結果（タップで表示）</summary>
        <div style={{ height: 10 }} />
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
                    <Link href={`/matches/${m.id}`}>
                      {m.homeName} vs {m.awayName}
                    </Link>
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
      </details>
    </div>
  );
}
