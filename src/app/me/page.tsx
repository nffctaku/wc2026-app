"use client";

import Link from "next/link";
import styles from "../page.module.css";

import { useEffect, useMemo, useState } from "react";

import { auth } from "@/lib/firebase/client";
import { signInWithGoogle, signOut, subscribeAuth } from "@/lib/firebase/auth";

import RankingGauge from "@/app/me/_components/RankingGauge";
import StatGauge from "@/app/me/_components/StatGauge";
import useProfileStats from "@/app/me/_lib/useProfileStats";

export default function MePage() {
  const [user, setUser] = useState(() => auth.currentUser);
  const [error, setError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const uid = user?.uid ?? null;
  const {
    error: statsError,
    userDoc,
    teams,
    totalPoints,
    ranking,
    totalUsers,
    predictionCount,
    perfectRate,
    outcomeRate,
    eligibleFinishedCount,
    perfectHitCount,
    outcomeHitCount,
  } = useProfileStats(uid, { subscribeUserDoc: true });

  useEffect(() => {
    return subscribeAuth((u) => {
      setUser(u);
      setError(null);
    });
  }, []);

  const displayError = error ?? statsError;

  async function onClickLogin() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onClickLogout() {
    setError(null);
    try {
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onClickShare() {
    setShareStatus(null);
    try {
      if (!uid) return;
      const url = `${window.location.origin}/users/${uid}`;
      const title = `${userDoc?.nickname?.trim() || "WC2026"} | WC2026`;
      const text = `RANK ${ranking != null ? ranking.toLocaleString("ja-JP") : "-"} / ${
        totalPoints != null ? totalPoints.toLocaleString("ja-JP") : "-"
      } Pts`;

      if (typeof navigator !== "undefined" && "share" in navigator && typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareStatus("URLをコピーしました");
        return;
      }

      setShareStatus("この環境では共有できません");
    } catch {
      setShareStatus("共有に失敗しました");
    }
  }

  const championName = useMemo(() => {
    const id = userDoc?.championTeamId;
    if (!id) return null;
    return teams.get(id)?.nameJa ?? null;
  }, [teams, userDoc?.championTeamId]);

  return (
    <div
      className={styles.page}
      style={{
        minHeight: "100vh",
        backgroundColor: "#040913",
        backgroundImage: "linear-gradient(135deg, #040913 0%, #0b1f3a 45%, #2b1d5f 100%)",
        position: "relative",
        ["--background" as any]: "transparent",
        ["--foreground" as any]: "transparent",
        ["--text-primary" as any]: "rgba(255,255,255,0.96)",
        ["--text-secondary" as any]: "rgba(255,255,255,0.72)",
        ["--button-secondary-border" as any]: "rgba(255,255,255,0.18)",
        ["--button-secondary-hover" as any]: "rgba(255,255,255,0.10)",
        ["--button-primary-hover" as any]: "rgba(255,255,255,0.86)",
      }}
    >
      <div className={`${styles.bgLayer} ${styles.bg1}`} />
      <div className={`${styles.bgLayer} ${styles.bg2}`} />
      <div className={`${styles.bgLayer} ${styles.bg3}`} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.38)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.14), transparent 46%)",
          pointerEvents: "none",
        }}
      />

      <main className={styles.main} style={{ position: "relative", backgroundColor: "transparent", paddingTop: 36, paddingBottom: 36 }}>
        <div style={{ width: "100%", display: "grid", gap: 14 }}>
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
                subValue={
                  typeof perfectHitCount === "number" && typeof eligibleFinishedCount === "number"
                    ? `${perfectHitCount}/${eligibleFinishedCount}`
                    : undefined
                }
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
                subValue={
                  typeof outcomeHitCount === "number" && typeof eligibleFinishedCount === "number"
                    ? `${outcomeHitCount}/${eligibleFinishedCount}`
                    : undefined
                }
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
            {user ? (
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
                    ) : userDoc?.nickname?.trim() ? (
                      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)", fontSize: 36, lineHeight: "36px" }}>
                        {userDoc.nickname.trim().slice(0, 1).toUpperCase()}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 28, color: "#a855f7", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {userDoc?.nickname?.trim() || "-"}
                    </div>
                    <div style={{ display: "flex", gap: 12, color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 14 }}>
                      <div>ID</div>
                      <div>{userDoc?.idNo != null ? String(userDoc.idNo).padStart(5, "0") : "-"}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "0 0 auto" }}>
                  {userDoc?.xUrl ? (
                    <a
                      href={userDoc.xUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="X"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, color: "#000", textDecoration: "none" }}
                    >
                      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ display: "block" }}>
                        <path
                          fill="currentColor"
                          d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.3L6.4 22H3.3l7.3-8.4L1 2h6.3l4.4 5.8L18.9 2Zm-1.1 18h1.7L6.5 3.9H4.7L17.8 20Z"
                        />
                      </svg>
                    </a>
                  ) : (
                    <div aria-label="X" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, color: "rgba(0,0,0,0.18)" }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ display: "block" }}>
                        <path
                          fill="currentColor"
                          d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.9-6.3L6.4 22H3.3l7.3-8.4L1 2h6.3l4.4 5.8L18.9 2Zm-1.1 18h1.7L6.5 3.9H4.7L17.8 20Z"
                        />
                      </svg>
                    </div>
                  )}
                  {userDoc?.instagramUrl ? (
                    <a
                      href={userDoc.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Instagram"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, color: "#e1306c", textDecoration: "none" }}
                    >
                      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ display: "block" }}>
                        <path
                          fill="currentColor"
                          d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9A3.5 3.5 0 0 0 20 16.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm4.5 4a6 6 0 1 1 0 12a6 6 0 0 1 0-12Zm0 2a4 4 0 1 0 0 8a4 4 0 0 0 0-8Zm6.4-2.6a1.2 1.2 0 1 1 0 2.4a1.2 1.2 0 0 1 0-2.4Z"
                        />
                      </svg>
                    </a>
                  ) : (
                    <div aria-label="Instagram" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, color: "rgba(0,0,0,0.18)" }}>
                      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" style={{ display: "block" }}>
                        <path
                          fill="currentColor"
                          d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9A3.5 3.5 0 0 0 20 16.5v-9A3.5 3.5 0 0 0 16.5 4h-9Zm4.5 4a6 6 0 1 1 0 12a6 6 0 0 1 0-12Zm0 2a4 4 0 1 0 0 8a4 4 0 0 0 0-8Zm6.4-2.6a1.2 1.2 0 1 1 0 2.4a1.2 1.2 0 0 1 0-2.4Z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>マイページ</div>
                <div>Googleログインしてください</div>
              </div>
            )}

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 900 }}>優勝チーム予想</div>
              <div style={{ color: "rgba(0,0,0,0.65)", fontWeight: 700 }}>{championName ?? "未設定"}</div>
            </div>

            {displayError ? <p style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>{displayError}</p> : null}
          </div>

          {uid ? (
            <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={onClickShare}
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  background: "#fff",
                  borderRadius: 999,
                  padding: "10px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                シェア
              </button>
              {shareStatus ? <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.55)", textAlign: "center" }}>{shareStatus}</div> : null}
              <Link
                href="/me/edit"
                style={{
                  textAlign: "center",
                  fontWeight: 900,
                  color: "rgba(0,0,0,0.65)",
                  textDecoration: "none",
                }}
              >
                プロフィール編集
              </Link>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
