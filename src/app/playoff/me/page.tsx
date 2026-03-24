"use client";

import Link from "next/link";
import styles from "@/app/page.module.css";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import { auth } from "@/lib/firebase/client";
import { db } from "@/lib/firebase/client";
import { signInWithGoogle, signOut, subscribeAuth } from "@/lib/firebase/auth";

import RankingGauge from "@/app/me/_components/RankingGauge";
import StatGauge from "@/app/me/_components/StatGauge";

type PlayoffUserStatsDoc = {
  uid: string;
  totalPoints?: number;
};

type PlayoffUserMatchPointsDoc = {
  uid?: string;
  matchId?: string;
  points?: number;
};

type PlayoffPredictionDoc = {
  uid?: string;
};

export default function PlayoffMePage() {
  const [user, setUser] = useState(() => auth.currentUser);
  const [error, setError] = useState<string | null>(null);

  const uid = user?.uid ?? null;

  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [ranking, setRanking] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  const [eligibleFinishedCount, setEligibleFinishedCount] = useState<number | null>(null);
  const [perfectHitCount, setPerfectHitCount] = useState<number | null>(null);
  const [outcomeHitCount, setOutcomeHitCount] = useState<number | null>(null);

  useEffect(() => {
    return subscribeAuth((u) => {
      setUser(u);
      setError(null);
    });
  }, []);

  const displayError = error;

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

  useEffect(() => {
    async function run() {
      if (!uid) {
        setTotalPoints(null);
        setRanking(null);
        setTotalUsers(null);
        setEligibleFinishedCount(null);
        setPerfectHitCount(null);
        setOutcomeHitCount(null);
        return;
      }

      try {
        const statsSnap = await getDocs(query(collection(db, "playoffUserStats"), where("uid", "==", uid)));
        const statsDoc = statsSnap.docs[0]?.data() as PlayoffUserStatsDoc | undefined;
        const tp = typeof statsDoc?.totalPoints === "number" ? statsDoc.totalPoints : 0;
        setTotalPoints(tp);
      } catch {
        setTotalPoints(null);
      }

      try {
        const predSnap = await getDocs(collection(db, "playoffPredictions"));
        const participantUids = new Set<string>();
        for (const d of predSnap.docs) {
          const p = d.data() as PlayoffPredictionDoc;
          if (typeof p.uid === "string" && p.uid) participantUids.add(p.uid);
        }
        setTotalUsers(participantUids.size);

        const allStatsSnap = await getDocs(query(collection(db, "playoffUserStats"), orderBy("totalPoints", "desc")));
        let found: number | null = null;
        for (let i = 0; i < allStatsSnap.docs.length; i++) {
          const d = allStatsSnap.docs[i]!;
          const data = d.data() as { uid?: string };
          if (data.uid === uid) {
            found = i + 1;
            break;
          }
        }
        setRanking(found);
      } catch {
        setRanking(null);
        setTotalUsers(null);
      }

      try {
        const pointsSnap = await getDocs(query(collection(db, "playoffUserMatchPoints"), where("uid", "==", uid)));
        let eligible = 0;
        let perfect = 0;
        let outcome = 0;

        for (const d of pointsSnap.docs) {
          const p = d.data() as PlayoffUserMatchPointsDoc;
          if (typeof p.points !== "number") continue;
          eligible += 1;
          if (p.points >= 50) perfect += 1;
          if (p.points >= 20) outcome += 1;
        }

        setEligibleFinishedCount(eligible);
        setPerfectHitCount(perfect);
        setOutcomeHitCount(outcome);
      } catch {
        setEligibleFinishedCount(null);
        setPerfectHitCount(null);
        setOutcomeHitCount(null);
      }
    }

    void run();
  }, [uid]);

  const perfectRate = useMemo(() => {
    if (eligibleFinishedCount == null || eligibleFinishedCount === 0 || perfectHitCount == null) return null;
    return (perfectHitCount / eligibleFinishedCount) * 100;
  }, [eligibleFinishedCount, perfectHitCount]);

  const outcomeRate = useMemo(() => {
    if (eligibleFinishedCount == null || eligibleFinishedCount === 0 || outcomeHitCount == null) return null;
    return (outcomeHitCount / eligibleFinishedCount) * 100;
  }, [eligibleFinishedCount, outcomeHitCount]);

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <Link href="/playoff" style={{ color: "rgba(255,255,255,0.92)", textDecoration: "none", fontWeight: 900 }}>
              ← プレーオフ
            </Link>
            <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.95)" }}>プレーオフ マイページ</div>
            <div style={{ width: 60 }} />
          </div>

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

            <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, alignItems: "start" }}>
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
                <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.74)" }}>ログイン中</div>
                <button
                  onClick={() => void onClickLogout()}
                  style={{
                    appearance: "none",
                    WebkitAppearance: "none",
                    border: "1px solid rgba(0,0,0,0.14)",
                    background: "rgba(255,255,255,0.88)",
                    borderRadius: 999,
                    padding: "10px 14px",
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  ログアウト
                </button>
              </div>
            ) : (
              <button
                onClick={() => void onClickLogin()}
                style={{
                  appearance: "none",
                  WebkitAppearance: "none",
                  border: "1px solid rgba(0,0,0,0.14)",
                  background: "#f4c94b",
                  borderRadius: 999,
                  padding: "12px 14px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Googleでログイン
              </button>
            )}

            {displayError ? <pre style={{ color: "#b00020", margin: 0, whiteSpace: "pre-wrap" }}>{displayError}</pre> : null}

            <div style={{ display: "grid", gap: 8 }}>
              <Link
                href="/playoff/ranking"
                style={{
                  textDecoration: "none",
                  color: "rgba(0,0,0,0.78)",
                  fontWeight: 900,
                  border: "1px solid rgba(0,0,0,0.10)",
                  borderRadius: 16,
                  padding: 14,
                  background: "rgba(255,255,255,0.88)",
                }}
              >
                プレーオフランキングを見る
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
