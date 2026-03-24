export type PlayoffMatchId =
  | "A1"
  | "A2"
  | "A3"
  | "B1"
  | "B2"
  | "B3"
  | "C1"
  | "C2"
  | "C3"
  | "D1"
  | "D2"
  | "D3";

export type PlayoffBlockKey = "A" | "B" | "C" | "D";

export type PlayoffMatch = {
  id: PlayoffMatchId;
  block: PlayoffBlockKey;
  label: "準決勝" | "決勝";
  home: string;
  away: string;
  homeCode?: string;
  awayCode?: string;
  kickoffAtIso: string;
};

export type PlayoffBlock = {
  blockName: string;
  matches: PlayoffMatch[];
};

export const playoffBlocks: PlayoffBlock[] = [
  {
    blockName: "ブロックA",
    matches: [
      { id: "A1", block: "A", label: "準決勝", home: "イタリア", away: "北アイルランド", homeCode: "ITA", awayCode: "NIR", kickoffAtIso: "2026-03-26T19:45:00.000Z" },
      { id: "A2", block: "A", label: "準決勝", home: "ウェールズ", away: "ボスニア・ヘルツェゴビナ", homeCode: "WAL", awayCode: "BIH", kickoffAtIso: "2026-03-26T19:45:00.000Z" },
      { id: "A3", block: "A", label: "決勝", home: "SF2勝者", away: "SF1勝者", kickoffAtIso: "2026-03-31T18:45:00.000Z" },
    ],
  },
  {
    blockName: "ブロックB",
    matches: [
      { id: "B1", block: "B", label: "準決勝", home: "ウクライナ", away: "スウェーデン", homeCode: "UKR", awayCode: "SWE", kickoffAtIso: "2026-03-26T19:45:00.000Z" },
      { id: "B2", block: "B", label: "準決勝", home: "ポーランド", away: "アルバニア", homeCode: "POL", awayCode: "ALB", kickoffAtIso: "2026-03-26T19:45:00.000Z" },
      { id: "B3", block: "B", label: "決勝", home: "SF3勝者", away: "SF4勝者", kickoffAtIso: "2026-03-31T18:45:00.000Z" },
    ],
  },
  {
    blockName: "ブロックC",
    matches: [
      { id: "C1", block: "C", label: "準決勝", home: "トルコ", away: "ルーマニア", homeCode: "TUR", awayCode: "ROU", kickoffAtIso: "2026-03-26T17:00:00.000Z" },
      { id: "C2", block: "C", label: "準決勝", home: "スロバキア", away: "コソボ", homeCode: "SVK", awayCode: "KOS", kickoffAtIso: "2026-03-26T19:45:00.000Z" },
      { id: "C3", block: "C", label: "決勝", home: "SF6勝者", away: "SF5勝者", kickoffAtIso: "2026-03-31T18:45:00.000Z" },
    ],
  },
  {
    blockName: "ブロックD",
    matches: [
      { id: "D1", block: "D", label: "準決勝", home: "デンマーク", away: "北マケドニア", homeCode: "DEN", awayCode: "MKD", kickoffAtIso: "2026-03-26T19:45:00.000Z" },
      { id: "D2", block: "D", label: "準決勝", home: "チェコ", away: "アイルランド共和国", homeCode: "CZE", awayCode: "IRL", kickoffAtIso: "2026-03-26T19:45:00.000Z" },
      { id: "D3", block: "D", label: "決勝", home: "SF8勝者", away: "SF7勝者", kickoffAtIso: "2026-03-31T18:45:00.000Z" },
    ],
  },
];

export const playoffMatches: PlayoffMatch[] = playoffBlocks.flatMap((b) => b.matches);

export function getPlayoffMatch(id: string): PlayoffMatch | null {
  return playoffMatches.find((m) => m.id === id) ?? null;
}
