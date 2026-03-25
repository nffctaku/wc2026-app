"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";

import { playoffBlocks, type PlayoffMatch, type PlayoffMatchId } from "./_lib/playoffMatches";
import { db } from "@/lib/firebase/client";

type PlayoffMatchResultDoc = {
  status?: "SCHEDULED" | "FINISHED";
  homeScore?: number;
  awayScore?: number;
  winner?: "HOME" | "AWAY";
};

function flagSrcByTeamName(name: string): string | null {
  const normalized = name.trim();
  const codeByName: Record<string, string> = {
    "イタリア": "ITA",
    "北アイルランド": "NIR",
    "ウェールズ": "WAL",
    "ボスニア・ヘルツェゴビナ": "BIH",
    "ウクライナ": "UKR",
    "スウェーデン": "SWE",
    "ポーランド": "POL",
    "アルバニア": "ALB",
    "トルコ": "TUR",
    "ルーマニア": "ROU",
    "スロバキア": "SVK",
    "コソボ": "KOS",
    "デンマーク": "DEN",
    "北マケドニア": "MKD",
    "チェコ": "CZE",
    "アイルランド共和国": "IRL",
  };

  const code = codeByName[normalized];
  if (!code) return null;
  return `/国旗/${code.toUpperCase()}.png`;
}

function TeamLine({ name }: { name: string }) {
  const flagSrc = flagSrcByTeamName(name);
  return (
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
      title={name}
    >
      {flagSrc ? (
        <img
          src={flagSrc}
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
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
    </div>
  );
}

function MatchCard({ match, result }: { match: PlayoffMatch; result?: PlayoffMatchResultDoc }) {
  const finished = result?.status === "FINISHED" && typeof result.homeScore === "number" && typeof result.awayScore === "number";
  const kickoffLabel = (() => {
    try {
      const d = new Date(match.kickoffAtIso);
      return d.toLocaleString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  })();
  return (
    <Link
      href={`/playoff/${encodeURIComponent(match.id)}`}
      style={{
        display: "grid",
        gridTemplateColumns: "88px 1fr 92px",
        gap: 10,
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.10)",
        background: "rgba(255,255,255,0.62)",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <div style={{ fontSize: 12, color: "rgba(0,0,0,0.62)", fontWeight: 900 }}>{match.label}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "grid", gridTemplateRows: "auto auto", gap: 4 }}>
          <TeamLine name={match.home} />
          <TeamLine name={match.away} />
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(0,0,0,0.55)",
            marginTop: 4,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {kickoffLabel}
        </div>
      </div>
      <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {finished ? (
          <div style={{ display: "grid", justifyItems: "end", gap: 2 }}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "rgba(0,0,0,0.88)" }}>
              {result.homeScore}-{result.awayScore}
            </div>
            <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(0,0,0,0.55)" }}>FT</div>
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
}

export default function PlayoffPage() {
  const [resultsById, setResultsById] = useState<Map<string, PlayoffMatchResultDoc>>(new Map());

  const matchById = new Map<PlayoffMatchId, PlayoffMatch>(playoffBlocks.flatMap((b) => b.matches).map((m) => [m.id, m] as const));

  const winnerNameByMatchId = (matchId: PlayoffMatchId): string | null => {
    const meta = matchById.get(matchId);
    const res = resultsById.get(matchId);
    if (!meta || !res) return null;
    if (res.status !== "FINISHED") return null;
    if (typeof res.homeScore !== "number" || typeof res.awayScore !== "number") return null;
    if (res.homeScore === res.awayScore) {
      if (res.winner === "HOME") return meta.home;
      if (res.winner === "AWAY") return meta.away;
      return null;
    }
    return res.homeScore > res.awayScore ? meta.home : meta.away;
  };

  const finalRefs: Partial<Record<PlayoffMatchId, { homeFrom: PlayoffMatchId; awayFrom: PlayoffMatchId }>> = {
    A3: { homeFrom: "A2", awayFrom: "A1" },
    B3: { homeFrom: "B1", awayFrom: "B2" },
    C3: { homeFrom: "C2", awayFrom: "C1" },
    D3: { homeFrom: "D2", awayFrom: "D1" },
  };

  const displayBlocks = playoffBlocks.map((b) => {
    return {
      ...b,
      matches: b.matches.map((m) => {
        if (m.label !== "決勝") return m;
        const ref = finalRefs[m.id];
        if (!ref) return m;
        const homeWinner = winnerNameByMatchId(ref.homeFrom);
        const awayWinner = winnerNameByMatchId(ref.awayFrom);
        return {
          ...m,
          home: homeWinner ?? m.home,
          away: awayWinner ?? m.away,
        };
      }),
    };
  });

  useEffect(() => {
    async function run() {
      try {
        const snap = await getDocs(collection(db, "playoffMatches"));
        const m = new Map<string, PlayoffMatchResultDoc>();
        for (const d of snap.docs) {
          m.set(d.id, d.data() as PlayoffMatchResultDoc);
        }
        setResultsById(m);
      } catch {
        setResultsById(new Map());
      }
    }
    void run();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.72), transparent 56%), linear-gradient(180deg, #fffdf6 0%, #fff3da 100%)",
        color: "rgba(0,0,0,0.88)",
        position: "relative",
        padding: 24,
        display: "grid",
        alignContent: "start",
        gap: 12,
      }}
    >
      <div style={{ position: "relative", display: "grid", alignContent: "start", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Link
            href="/playoff/ranking"
            style={{
              display: "grid",
              placeItems: "center",
              padding: "7px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(255,255,255,0.62)",
              color: "inherit",
              textDecoration: "none",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 0.2,
            }}
          >
            プレーオフランキング
          </Link>
          <Link
            href="/playoff/me"
            style={{
              display: "grid",
              placeItems: "center",
              padding: "7px 10px",
              borderRadius: 10,
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(255,255,255,0.62)",
              color: "inherit",
              textDecoration: "none",
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 0.2,
            }}
          >
            プレーオフマイページ
          </Link>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {displayBlocks.map((b) => (
            <section key={b.blockName} style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{b.blockName}</div>
              <div style={{ display: "grid", gap: 10 }}>
                {b.matches.map((m, idx) => (
                  <MatchCard key={`${b.blockName}_${idx}`} match={m} result={resultsById.get(m.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
