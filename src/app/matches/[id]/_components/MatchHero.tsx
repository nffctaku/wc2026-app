"use client";

import Link from "next/link";

import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

import Countdown from "./Countdown";
import PredictionDistributionBar, { type PredictionDistribution } from "./PredictionDistributionBar";

export default function MatchHero({
  match,
  home,
  away,
  homeName,
  awayName,
  homeFlag,
  awayFlag,
  kickoff,
  lockLabel,
  kickoffMs,
  nowMs,
  distribution,
}: {
  match: MatchDoc;
  home: TeamDoc | null;
  away: TeamDoc | null;
  homeName: string;
  awayName: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoff: { date: string; time: string } | null;
  lockLabel: string;
  kickoffMs: number;
  nowMs?: number;
  distribution?: PredictionDistribution | null;
}) {
  return (
    <section
      style={{
        borderRadius: 0,
        overflow: "hidden",
        background: "linear-gradient(135deg, #040913 0%, #0b1f3a 45%, #2b1d5f 100%)",
        color: "#fff",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.14), transparent 46%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", padding: 16, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/matches" style={{ color: "rgba(255,255,255,0.92)", textDecoration: "none", fontWeight: 800 }}>
            ←
          </Link>
          <div
            style={{
              fontWeight: 900,
              fontSize: 14,
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {homeName} vs {awayName}
          </div>
        </div>

        <div style={{ textAlign: "center", display: "grid", gap: 4 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>
            {match.stageNameJa}
            {match.groupNameJa ? ` / ${match.groupNameJa}` : ""}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 110px 1fr",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
            {homeFlag ? (
              <img
                src={homeFlag}
                alt=""
                width={76}
                height={52}
                style={{ width: 76, height: 52, objectFit: "cover", borderRadius: 6 }}
              />
            ) : (
              <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.85)" }}>{home?.code ?? ""}</div>
            )}
            <div style={{ fontWeight: 800, fontSize: 12, color: "rgba(255,255,255,0.92)" }}>{homeName}</div>
          </div>

          <div style={{ textAlign: "center", display: "grid", gap: 2 }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>{kickoff?.date ?? ""}</div>
            <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{kickoff?.time ?? ""}</div>
            {match.status === "FINISHED" && typeof match.homeScore === "number" && typeof match.awayScore === "number" ? (
              <div style={{ marginTop: 6, fontWeight: 900, fontSize: 16 }}>
                {match.homeScore}-{match.awayScore}
              </div>
            ) : null}
          </div>

          <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
            {awayFlag ? (
              <img
                src={awayFlag}
                alt=""
                width={76}
                height={52}
                style={{ width: 76, height: 52, objectFit: "cover", borderRadius: 6 }}
              />
            ) : (
              <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.85)" }}>{away?.code ?? ""}</div>
            )}
            <div style={{ fontWeight: 800, fontSize: 12, color: "rgba(255,255,255,0.92)" }}>{awayName}</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 10,
            alignItems: "center",
            paddingTop: 6,
            color: "rgba(255,255,255,0.88)",
            fontSize: 12,
          }}
        >
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {match.stadiumNameJa}
            {match.cityNameJa ? `（${match.cityNameJa}）` : ""}
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <Countdown targetMs={kickoffMs} />
          </div>

          {distribution ? (
            <div style={{ paddingTop: 6 }}>
              <PredictionDistributionBar
                title="現在の勝敗予測"
                homePct={distribution.homeWinPct}
                drawPct={distribution.drawPct}
                awayPct={distribution.awayWinPct}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
