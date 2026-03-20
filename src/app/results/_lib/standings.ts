import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

export type MatchRow = MatchDoc & { id: string };

export type FormMark = "W" | "D" | "L";

export type TeamStanding = {
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

export type GroupStanding = {
  groupNameJa: string;
  teams: TeamStanding[];
};

export type ThirdPlaceRow = {
  groupNameJa: string;
  team: TeamStanding;
};

export function toGroupLetter(groupNameJa: string): string {
  const m = groupNameJa.match(/[A-Z]/);
  return m ? m[0] : groupNameJa;
}

function upsertTeam(map: Map<string, TeamStanding>, teamId: string, teamLabel: string): TeamStanding {
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

export function computeStandings(matches: MatchRow[], teamsById: Map<string, TeamDoc>): GroupStanding[] {
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
