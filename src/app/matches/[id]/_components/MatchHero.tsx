"use client";

import Link from "next/link";

import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

import Countdown from "./Countdown";
import PredictionDistributionBar, { type PredictionDistribution } from "./PredictionDistributionBar";
import ScoreStepper from "./ScoreStepper";

type RelatedMatchCard = {
  id: string;
  href?: string;
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

  backHref,

  lockedLabel,
  uid,
  predError,
  predBusy,
  canEditPrediction,
  homeScore,
  awayScore,
  onHomeScoreChange,
  onAwayScoreChange,

  onSharePrediction,
  shareStatus,

  relatedGroupMatches,
  relatedMatchesTitle,
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

  backHref?: string;

  lockedLabel: string;
  uid: string | null;
  predError: string | null;
  predBusy: boolean;
  canEditPrediction: boolean;
  homeScore: number;
  awayScore: number;
  onHomeScoreChange: (value: number) => void;
  onAwayScoreChange: (value: number) => void;

  onSharePrediction: () => void | Promise<void>;
  shareStatus: string | null;

  relatedGroupMatches?: RelatedMatchCard[];
  relatedMatchesTitle?: string;
}) {
  const resolvedBackHref = backHref ?? "/results";
  const resolvedRelatedTitle = relatedMatchesTitle ?? "同じグループの他の試合";
  return (
    <section
      style={{
        borderRadius: 0,
        overflow: "hidden",
        background:
          "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.72), transparent 56%), linear-gradient(180deg, #fffdf6 0%, #fff3da 100%)",
        color: "rgba(0,0,0,0.88)",
        position: "relative",
      }}
    >
      <div style={{ position: "relative", padding: 16, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href={resolvedBackHref} style={{ color: "rgba(0,0,0,0.72)", textDecoration: "none", fontWeight: 800 }}>
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
          <div style={{ fontSize: 12, color: "rgba(0,0,0,0.62)" }}>
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
              <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.72)" }}>{home?.code ?? ""}</div>
            )}
            <div style={{ fontWeight: 800, fontSize: 12, color: "rgba(0,0,0,0.88)" }}>{homeName}</div>
            {typeof home?.fifaRank === "number" ? (
              <div style={{ fontWeight: 900, fontSize: 11, color: "rgba(0,0,0,0.55)" }}>FIFA {home.fifaRank}</div>
            ) : null}
          </div>

          <div style={{ textAlign: "center", display: "grid", gap: 2 }}>
            <div style={{ fontWeight: 900, fontSize: 14 }}>{kickoff?.date ?? ""}</div>
            <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{kickoff?.time ?? ""}</div>
            {match.status === "FINISHED" && typeof match.homeScore === "number" && typeof match.awayScore === "number" ? (
              <div style={{ marginTop: 6, display: "grid", gap: 2, justifyItems: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>
                  {match.homeScore}-{match.awayScore}
                </div>
                {typeof match.homePenScore === "number" && typeof match.awayPenScore === "number" ? (
                  <div style={{ fontWeight: 900, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>
                    PK {match.homePenScore}-{match.awayPenScore}
                  </div>
                ) : null}
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
              <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.72)" }}>{away?.code ?? ""}</div>
            )}
            <div style={{ fontWeight: 800, fontSize: 12, color: "rgba(0,0,0,0.88)" }}>{awayName}</div>
            {typeof away?.fifaRank === "number" ? (
              <div style={{ fontWeight: 900, fontSize: 11, color: "rgba(0,0,0,0.55)" }}>FIFA {away.fifaRank}</div>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 10,
            alignItems: "center",
            paddingTop: 6,
            color: "rgba(0,0,0,0.72)",
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
              borderTop: "1px solid rgba(0,0,0,0.10)",
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>スコア予想</div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.55)", fontWeight: 700 }}>{lockedLabel}</div>
            </div>

            {!uid ? <div style={{ marginTop: 2, fontSize: 13 }}>予想の入力にはログインが必要です</div> : null}
            {predError ? <pre style={{ color: "#b00020", margin: "0" }}>{predError}</pre> : null}
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

              <div style={{ fontWeight: 900, fontSize: 20, color: "rgba(0,0,0,0.55)", paddingBottom: 2 }}>:</div>

              <div style={{ display: "grid", justifyItems: "center", gap: 4, minWidth: 0 }}>
                <ScoreStepper
                  value={awayScore}
                  onChange={onAwayScoreChange}
                  disabled={!canEditPrediction || predBusy}
                  side="right"
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6, paddingTop: 6 }}>
              <button
                type="button"
                onClick={onSharePrediction}
                disabled={!uid}
                style={{
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "rgba(255,255,255,0.40)",
                  backdropFilter: "blur(12px) saturate(140%)",
                  WebkitBackdropFilter: "blur(12px) saturate(140%)",
                  color: "rgba(0,0,0,0.82)",
                  borderRadius: 999,
                  padding: "10px 12px",
                  fontWeight: 900,
                  cursor: !uid ? "not-allowed" : "pointer",
                  opacity: !uid ? 0.55 : 1,
                }}
              >
                Xでシェア
              </button>
              {shareStatus ? (
                <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(0,0,0,0.62)", textAlign: "center" }}>{shareStatus}</div>
              ) : null}
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
              <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(0,0,0,0.72)" }}>{resolvedRelatedTitle}</div>
              <div style={{ display: "grid", gap: 8 }}>
                {relatedGroupMatches.map((m) => (
                  <Link
                    key={m.id}
                    href={m.href ?? `/matches/${m.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      background: "rgba(255,255,255,0.40)",
                      backdropFilter: "blur(12px) saturate(140%)",
                      WebkitBackdropFilter: "blur(12px) saturate(140%)",
                      border: "1px solid rgba(0,0,0,0.10)",
                      borderRadius: 12,
                      padding: 10,
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: "rgba(0,0,0,0.55)", fontWeight: 800 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.kickoffLabel}</div>
                      <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.72)" }}>{m.status === "FINISHED" ? "試合終了" : ""}</div>
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
                      <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.72)" }}>{m.scoreLabel ?? "vs"}</div>
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
