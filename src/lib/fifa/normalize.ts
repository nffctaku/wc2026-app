import { Timestamp } from "firebase/firestore";
import type { FifaMatch } from "./api";
import { pickJa } from "./api";

export type TeamDoc = {
  fifaTeamId?: string;
  fifaCountryId?: string;
  code?: string;
  nameJa: string;
  flagUrl?: string;
  isPlaceholder?: boolean;
  placeholderKey?: string;
};

export type MatchDoc = {
  matchNumber: number;
  stageNameJa: string;
  groupNameJa: string;
  kickoffAt: Timestamp;
  lockAt: Timestamp;
  homeTeamId: string;
  awayTeamId: string;
  stadiumNameJa: string;
  cityNameJa: string;
  status: "SCHEDULED" | "FINISHED";
  homeScore?: number;
  awayScore?: number;
};

function toPlaceholderId(raw: string): string {
  return `PH_${raw.replaceAll("/", "_")}`;
}

export function normalizeMatches(results: FifaMatch[]): {
  teams: Map<string, TeamDoc>;
  matches: Map<string, MatchDoc>;
} {
  const teams = new Map<string, TeamDoc>();
  const matches = new Map<string, MatchDoc>();

  for (const m of results) {
    const kickoff = new Date(m.Date);
    const lock = new Date(kickoff.getTime() - 30 * 60 * 1000);

    const homeIdTeam = m.Home?.IdTeam;
    const awayIdTeam = m.Away?.IdTeam;

    const homeTeamId = homeIdTeam
      ? `T_${homeIdTeam}`
      : m.PlaceHolderA
        ? toPlaceholderId(m.PlaceHolderA)
        : "PH_TBD_HOME";
    const awayTeamId = awayIdTeam
      ? `T_${awayIdTeam}`
      : m.PlaceHolderB
        ? toPlaceholderId(m.PlaceHolderB)
        : "PH_TBD_AWAY";

    if (homeIdTeam && !teams.has(`T_${homeIdTeam}`)) {
      teams.set(`T_${homeIdTeam}`, {
        fifaTeamId: homeIdTeam,
        fifaCountryId: m.Home?.IdCountry,
        code: m.Home?.Abbreviation,
        nameJa: pickJa(m.Home?.TeamName),
        flagUrl: m.Home?.PictureUrl,
      });
    }

    if (awayIdTeam && !teams.has(`T_${awayIdTeam}`)) {
      teams.set(`T_${awayIdTeam}`, {
        fifaTeamId: awayIdTeam,
        fifaCountryId: m.Away?.IdCountry,
        code: m.Away?.Abbreviation,
        nameJa: pickJa(m.Away?.TeamName),
        flagUrl: m.Away?.PictureUrl,
      });
    }

    if (!homeIdTeam && m.PlaceHolderA) {
      const id = toPlaceholderId(m.PlaceHolderA);
      if (!teams.has(id)) {
        teams.set(id, {
          isPlaceholder: true,
          placeholderKey: m.PlaceHolderA,
          nameJa: m.PlaceHolderA,
        });
      }
    }

    if (!awayIdTeam && m.PlaceHolderB) {
      const id = toPlaceholderId(m.PlaceHolderB);
      if (!teams.has(id)) {
        teams.set(id, {
          isPlaceholder: true,
          placeholderKey: m.PlaceHolderB,
          nameJa: m.PlaceHolderB,
        });
      }
    }

    matches.set(m.IdMatch, {
      matchNumber: m.MatchNumber,
      stageNameJa: pickJa(m.StageName),
      groupNameJa: pickJa(m.GroupName),
      kickoffAt: Timestamp.fromDate(kickoff),
      lockAt: Timestamp.fromDate(lock),
      homeTeamId,
      awayTeamId,
      stadiumNameJa: pickJa(m.Stadium?.Name),
      cityNameJa: pickJa(m.Stadium?.CityName),
      status: "SCHEDULED",
    });
  }

  return { teams, matches };
}
