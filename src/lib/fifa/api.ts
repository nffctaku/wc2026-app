export const FIFA_MATCHES_URL =
  "https://api.fifa.com/api/v3/calendar/matches?language=ja&count=500&idSeason=285023";

type Localized = { Locale: string; Description: string };

export type FifaMatchTeam = {
  IdTeam?: string;
  IdCountry?: string;
  Abbreviation?: string;
  PictureUrl?: string;
  TeamName?: Localized[];
};

export type FifaMatch = {
  IdMatch: string;
  MatchNumber: number;
  Date: string;
  LocalDate?: string;
  StageName?: Localized[];
  GroupName?: Localized[];
  Home?: FifaMatchTeam | null;
  Away?: FifaMatchTeam | null;
  PlaceHolderA?: string | null;
  PlaceHolderB?: string | null;
  Stadium?: {
    IdStadium?: string;
    Name?: Localized[];
    CityName?: Localized[];
    IdCountry?: string;
  } | null;
};

export type FifaMatchesResponse = {
  Results: FifaMatch[];
};

export async function fetchFifaMatches(): Promise<FifaMatch[]> {
  const res = await fetch(FIFA_MATCHES_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch FIFA matches: ${res.status}`);
  }
  const json = (await res.json()) as FifaMatchesResponse;
  return json.Results;
}

export function pickJa(items?: Localized[]): string {
  if (!items || items.length === 0) return "";
  return (
    items.find((x) => x.Locale === "ja-JP")?.Description ??
    items.find((x) => x.Locale.toLowerCase().startsWith("ja"))?.Description ??
    items[0]!.Description
  );
}
