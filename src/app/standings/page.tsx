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
};

type GroupStanding = {
  groupNameJa: string;
  teams: TeamStanding[];
};

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
  };
  map.set(teamId, t);
  return t;
}

function computeStandings(matches: MatchRow[], teamsById: Map<string, TeamDoc>): GroupStanding[] {
  const groupTeams = new Map<string, Map<string, TeamStanding>>();

  for (const m of matches) {
    const group = m.groupNameJa || "(group unknown)";
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
    } else if (m.homeScore < m.awayScore) {
      away.win += 1;
      away.pts += 3;
      home.loss += 1;
    } else {
      home.draw += 1;
      away.draw += 1;
      home.pts += 1;
      away.pts += 1;
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

export default function StandingsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<GroupStanding[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      setBusy(true);
      setError(null);
      try {
        const teamSnap = await getDocs(collection(db, "teams"));
        const teamMap = new Map<string, TeamDoc>();
        for (const d of teamSnap.docs) {
          teamMap.set(d.id, d.data() as TeamDoc);
        }

        const matchQ = query(collection(db, "matches"), orderBy("kickoffAt", "asc"));
        const matchSnap = await getDocs(matchQ);
        const matches: MatchRow[] = matchSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as MatchDoc),
        }));

        const computed = computeStandings(matches, teamMap);
        setGroups(computed);

        const latest = matches.reduce<Timestamp | null>((acc, m) => {
          if (m.status !== "FINISHED") return acc;
          if (typeof m.homeScore !== "number" || typeof m.awayScore !== "number") return acc;
          return acc === null || m.kickoffAt.toMillis() > acc.toMillis() ? m.kickoffAt : acc;
        }, null);
        setUpdatedAt(latest ? formatTs(latest) : null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, []);

  const visibleGroups = useMemo(() => {
    return groups.filter((g) => g.groupNameJa && g.groupNameJa !== "(group unknown)");
  }, [groups]);

  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ margin: 0 }}>順位表</h1>
      </div>

      {busy ? <p>読込中...</p> : null}
      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}
      {!busy && !error ? (
        <p style={{ color: "#666" }}>
          更新: {updatedAt ?? "-"}
        </p>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {visibleGroups.map((g) => (
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

            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                      順
                    </th>
                    <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                      チーム
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      試合
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      勝
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      分
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      敗
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      得
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      失
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      差
                    </th>
                    <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                      勝点
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.teams.map((t, idx) => (
                    <tr key={t.teamId}>
                      <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>{idx + 1}</td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2" }}>
                        {t.teamLabel}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>
                        {t.played}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>
                        {t.win}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>
                        {t.draw}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>
                        {t.loss}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>
                        {t.gf}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>
                        {t.ga}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right" }}>
                        {t.gd}
                      </td>
                      <td style={{ padding: 8, borderBottom: "1px solid #f2f2f2", textAlign: "right", fontWeight: 700 }}>
                        {t.pts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
