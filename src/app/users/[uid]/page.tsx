"use client";

import Link from "next/link";
import { use, useMemo } from "react";

import styles from "../../page.module.css";

import RankingGauge from "@/app/me/_components/RankingGauge";
import StatGauge from "@/app/me/_components/StatGauge";
import useProfileStats from "@/app/me/_lib/useProfileStats";

export default function UserProfilePage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = use(params);

  const { busy, error, userDoc, teams, totalPoints, ranking, totalUsers, predictionCount, perfectRate, outcomeRate } = useProfileStats(uid, {
    subscribeUserDoc: false,
  });

  const championName = useMemo(() => {
    const id = userDoc?.championTeamId;
    if (!id) return null;
    return teams.get(id)?.nameJa ?? null;
  }, [teams, userDoc?.championTeamId]);

  const nickname = userDoc?.nickname?.trim() || "(no name)";
  const idLabel = userDoc?.idNo != null ? String(userDoc.idNo).padStart(5, "0") : "-";

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div style={{ width: "100%", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/ranking">← ランキング</Link>
            <Link href="/me">自分のマイページ</Link>
          </div>

          {busy ? <div>読込中...</div> : null}
          {error ? <pre style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>{error}</pre> : null}

          <div
            style={{
              width: "100%",
              borderRadius: 22,
              padding: 20,
              background: "rgba(255, 251, 235, 0.98)",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 10px 30px rgba(16,24,40,0.08)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
              <RankingGauge points={totalPoints} rank={ranking} total={totalUsers} />
            </div>

            <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, alignItems: "start" }}>
              <StatGauge
                value={typeof perfectRate === "number" ? String(Math.round(perfectRate)) : "-"}
                label="完全的中率"
                unit="%"
                progress={typeof perfectRate === "number" ? perfectRate / 100 : 0}
                accentColor={
                  typeof perfectRate === "number"
                    ? perfectRate <= 30
                      ? "#ef4444"
                      : perfectRate <= 60
                        ? "#f59e0b"
                        : "#22c55e"
                    : undefined
                }
              />
              <StatGauge
                value={typeof outcomeRate === "number" ? String(Math.round(outcomeRate)) : "-"}
                label="勝敗的中率"
                unit="%"
                progress={typeof outcomeRate === "number" ? outcomeRate / 100 : 0}
                accentColor={
                  typeof outcomeRate === "number"
                    ? outcomeRate <= 30
                      ? "#ef4444"
                      : outcomeRate <= 60
                        ? "#f59e0b"
                        : "#22c55e"
                    : undefined
                }
              />
              <StatGauge
                value={typeof predictionCount === "number" ? String(predictionCount) : "-"}
                label="予想試合数"
                progress={typeof predictionCount === "number" ? predictionCount / 104 : 0}
                accentColor={
                  typeof predictionCount === "number"
                    ? predictionCount <= 20
                      ? "#3b82f6"
                      : predictionCount <= 70
                        ? "#b45309"
                        : "#f59e0b"
                    : undefined
                }
              />
            </div>
          </div>

          <div
            style={{
              width: "100%",
              background: "rgba(255, 251, 235, 0.98)",
              borderRadius: 22,
              padding: 18,
              display: "grid",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <div
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "#7a8a93",
                    flex: "0 0 auto",
                    border: "1px solid rgba(0,0,0,0.10)",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {userDoc?.photoURL ? (
                    <img src={userDoc.photoURL} alt="" width={78} height={78} style={{ width: 78, height: 78, objectFit: "cover" }} />
                  ) : nickname.trim() ? (
                    <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)", fontSize: 36, lineHeight: "36px" }}>
                      {nickname.trim().slice(0, 1).toUpperCase()}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 28, color: "#a855f7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {nickname}
                  </div>
                  <div style={{ display: "flex", gap: 12, color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 14 }}>
                    <div>ID</div>
                    <div>{idLabel}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>
                {userDoc?.xUrl ? (
                  <a href={userDoc.xUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 900, fontSize: 32, color: "#000", textDecoration: "none" }}>
                    X
                  </a>
                ) : (
                  <div style={{ fontWeight: 900, fontSize: 32, color: "rgba(0,0,0,0.18)" }}>X</div>
                )}
                {userDoc?.instagramUrl ? (
                  <a href={userDoc.instagramUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 900, fontSize: 30, color: "#e1306c", textDecoration: "none" }}>
                    IG
                  </a>
                ) : (
                  <div style={{ fontWeight: 900, fontSize: 30, color: "rgba(0,0,0,0.18)" }}>IG</div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 900 }}>優勝チーム予想</div>
              <div style={{ color: "rgba(0,0,0,0.65)", fontWeight: 700 }}>{championName ?? "未設定"}</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
