"use client";

import type { ThirdPlaceRow } from "../_lib/standings";
import type { TeamDoc } from "@/lib/fifa/normalize";
import { localFlagSrc } from "../_lib/format";
import { toGroupLetter } from "../_lib/standings";

export default function ThirdPlaceRanking({
  thirdPlaceRanking,
  teams,
}: {
  thirdPlaceRanking: ThirdPlaceRow[];
  teams: Map<string, TeamDoc>;
}) {
  return (
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
                  <tr key={`${r.groupNameJa}_${r.team.teamId}`} style={{ background: inTop8 ? "rgba(23,138,42,0.10)" : undefined }}>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        {localFlagSrc(teams.get(r.team.teamId)) ? (
                          <img
                            src={localFlagSrc(teams.get(r.team.teamId))!}
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
  );
}
