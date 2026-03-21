"use client";

import Link from "next/link";

import type { GroupStanding, MatchRow } from "../_lib/standings";
import type { TeamDoc } from "@/lib/fifa/normalize";
import { formatTs, localFlagSrc } from "../_lib/format";

export default function GroupStandings({
  displayStandingsGroups,
  teams,
  groupMatches,
  pointsByMatchId,
}: {
  displayStandingsGroups: GroupStanding[];
  teams: Map<string, TeamDoc>;
  groupMatches: Map<string, MatchRow[]>;
  pointsByMatchId?: Map<string, number>;
}) {
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

  return (
    <section style={{ display: "grid", gap: 12 }}>
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
            style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden", background: "#fff" }}
          >
            <div
              style={{
                padding: "10px 12px",
                fontWeight: 700,
                borderBottom: "1px solid #eee",
                background: "#fff",
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
                          {localFlagSrc(teams.get(t.teamId)) ? (
                            <img
                              src={localFlagSrc(teams.get(t.teamId))!}
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
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>対戦カード（タップで表示）</summary>
                <div style={{ height: 10 }} />
                <div style={{ display: "grid", gap: 10 }}>
                  {(groupMatches.get(g.groupNameJa) ?? []).map((m) => {
                    const home = teams.get(m.homeTeamId)?.nameJa ?? m.homeTeamId;
                    const away = teams.get(m.awayTeamId)?.nameJa ?? m.awayTeamId;
                    const homeFlag = localFlagSrc(teams.get(m.homeTeamId));
                    const awayFlag = localFlagSrc(teams.get(m.awayTeamId));
                    const hasScore =
                      m.status === "FINISHED" && typeof m.homeScore === "number" && typeof m.awayScore === "number";
                    const scoreText = hasScore ? `${m.homeScore}-${m.awayScore}` : "-";
                    const points = pointsByMatchId?.get(m.id);
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
                          background: "#fff",
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
                              title={home}
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
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{home}</span>
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
                              title={away}
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
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{away}</span>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {hasScore ? (
                            <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                              <span style={{ fontSize: 16, fontWeight: 900 }}>{scoreText}</span>
                              {showPoints ? pointsBadge(points!) : null}
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
              </details>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
