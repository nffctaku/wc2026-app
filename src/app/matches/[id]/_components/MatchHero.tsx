"use client";

import Link from "next/link";

import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

import Countdown from "./Countdown";
import PredictionDistributionBar, { type PredictionDistribution } from "./PredictionDistributionBar";
import ScoreStepper from "./ScoreStepper";

type RelatedMatchCard = {
  id: string;
  kickoffLabel: string;
  homeName: string;
  awayName: string;
  homeFlag: string | null;
  awayFlag: string | null;
  status: "SCHEDULED" | "FINISHED";
  scoreLabel?: string;
};

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

  lockedLabel,
  uid,
  predError,
  predBusy,
  canEditPrediction,
  homeScore,
  awayScore,
  onHomeScoreChange,
  onAwayScoreChange,

  relatedGroupMatches,
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
  distribution: PredictionDistribution;

  lockedLabel: string;
  uid: string | null;
  predError: string | null;
  predBusy: boolean;
  canEditPrediction: boolean;
  homeScore: number;
  awayScore: number;
  onHomeScoreChange: (value: number) => void;
  onAwayScoreChange: (value: number) => void;

  relatedGroupMatches?: RelatedMatchCard[];
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

          <div
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTop: "1px solid rgba(255,255,255,0.18)",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>スコア予想</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", fontWeight: 700 }}>{lockedLabel}</div>
            </div>

            {!uid ? <div style={{ marginTop: 2, fontSize: 13 }}>予想の入力にはログインが必要です</div> : null}
            {predError ? <pre style={{ color: "#ffb4ab", margin: "0" }}>{predError}</pre> : null}
            {predBusy ? <div style={{ marginTop: 2, fontSize: 13 }}>予想を読込/保存中...</div> : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr auto",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ display: "grid", justifyItems: "center", gap: 4, minWidth: 0 }}>
                <ScoreStepper
                  value={homeScore}
                  onChange={onHomeScoreChange}
                  disabled={!canEditPrediction || predBusy}
                  side="left"
                />
              </div>

              <div style={{ fontWeight: 900, fontSize: 20, color: "rgba(255,255,255,0.85)", paddingBottom: 2 }}>:</div>

              <div style={{ display: "grid", justifyItems: "center", gap: 4, minWidth: 0 }}>
                <ScoreStepper
                  value={awayScore}
                  onChange={onAwayScoreChange}
                  disabled={!canEditPrediction || predBusy}
                  side="right"
                />
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 6 }}>
            <PredictionDistributionBar
              title="現在の勝敗予測"
              homePct={distribution.homeWinPct}
              drawPct={distribution.drawPct}
              awayPct={distribution.awayWinPct}
            />
          </div>

          {relatedGroupMatches && relatedGroupMatches.length > 0 ? (
            <div style={{ display: "grid", gap: 8, paddingTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.82)" }}>同じグループの他の試合</div>
              <div style={{ display: "grid", gap: 8 }}>
                {relatedGroupMatches.map((m) => (
                  <Link
                    key={m.id}
                    href={`/matches/${m.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 12,
                      padding: 10,
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 800 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.kickoffLabel}</div>
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.85)" }}>{m.status === "FINISHED" ? "試合終了" : ""}</div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        {m.homeFlag ? (
                          <img
                            src={m.homeFlag}
                            alt=""
                            width={24}
                            height={16}
                            style={{ width: 24, height: 16, objectFit: "cover", borderRadius: 4, flex: "0 0 auto" }}
                          />
                        ) : null}
                        <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.homeName}</div>
                      </div>
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.85)" }}>{m.scoreLabel ?? "vs"}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", minWidth: 0 }}>
                        <div style={{ fontWeight: 900, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.awayName}</div>
                        {m.awayFlag ? (
                          <img
                            src={m.awayFlag}
                            alt=""
                            width={24}
                            height={16}
                            style={{ width: 24, height: 16, objectFit: "cover", borderRadius: 4, flex: "0 0 auto" }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
