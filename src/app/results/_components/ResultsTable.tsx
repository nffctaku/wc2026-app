"use client";

import Link from "next/link";

import type { MatchRow } from "../_lib/standings";
import { formatTs } from "../_lib/format";

export type ResultsRow = MatchRow & { homeName: string; awayName: string };

export default function ResultsTable({ rows }: { rows: ResultsRow[] }) {
  const stageGroups = (() => {
    const map = new Map<string, Map<string, ResultsRow[]>>();

    for (const m of rows) {
      const stage = m.stageNameJa?.trim() ? m.stageNameJa.trim() : "ステージ未定";
      const group = m.groupNameJa?.trim() ? m.groupNameJa.trim() : "";

      if (!map.has(stage)) map.set(stage, new Map());
      const groupMap = map.get(stage)!;
      if (!groupMap.has(group)) groupMap.set(group, []);
      groupMap.get(group)!.push(m);
    }

    const list = Array.from(map.entries()).map(([stageNameJa, groupMap]) => {
      const groups = Array.from(groupMap.entries()).map(([groupNameJa, ms]) => {
        ms.sort((a, b) => a.kickoffAt.toMillis() - b.kickoffAt.toMillis());
        return { groupNameJa, matches: ms };
      });
      return { stageNameJa, groups };
    });

    list.sort((a, b) => a.stageNameJa.localeCompare(b.stageNameJa, "ja"));
    return list;
  })();

  return (
    <details style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
      <summary style={{ cursor: "pointer", fontWeight: 700 }}>試合結果（タップで表示）</summary>
      <div style={{ height: 10 }} />
      <div style={{ display: "grid", gap: 10 }}>
        {stageGroups.map((stage) => (
          <details
            key={stage.stageNameJa}
            style={{ border: "1px solid rgba(0,0,0,0.10)", borderRadius: 12, padding: 10 }}
          >
            <summary style={{ cursor: "pointer", fontWeight: 800 }}>{stage.stageNameJa}</summary>
            <div style={{ height: 10 }} />

            <div style={{ display: "grid", gap: 10 }}>
              {stage.groups.map((g) => (
                <details
                  key={`${stage.stageNameJa}__${g.groupNameJa}`}
                  style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 10 }}
                >
                  <summary style={{ cursor: "pointer", fontWeight: 700 }}>
                    {g.groupNameJa ? g.groupNameJa : "グループなし"}
                  </summary>
                  <div style={{ height: 10 }} />

                  <div style={{ display: "grid", gap: 10 }}>
                    {g.matches.map((m) => {
                      const hasScore = typeof m.homeScore === "number" && typeof m.awayScore === "number";
                      const score = hasScore ? `${m.homeScore}-${m.awayScore}` : "-";

                      return (
                        <Link
                          key={m.id}
                          href={`/matches/${m.id}`}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "88px 1fr 56px",
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
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 800,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={`${m.homeName} vs ${m.awayName}`}
                            >
                              {m.homeName} vs {m.awayName}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(0,0,0,0.55)", marginTop: 4 }}>
                              {m.cityNameJa} / {m.stadiumNameJa}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                            {hasScore ? (
                              score
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
              ))}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}
