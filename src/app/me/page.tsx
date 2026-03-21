"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "../page.module.css";

import { collection, getDocs, onSnapshot, doc, query, where, orderBy } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { auth, db } from "@/lib/firebase/client";
import { signInWithGoogle, signOut, subscribeAuth } from "@/lib/firebase/auth";
import { type UserDoc } from "@/lib/firebase/user";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

export default function MePage() {
  const [user, setUser] = useState(() => auth.currentUser);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [teams, setTeams] = useState<Map<string, TeamDoc>>(new Map());
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [ranking, setRanking] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [predictionCount, setPredictionCount] = useState<number | null>(null);
  const [perfectRate, setPerfectRate] = useState<number | null>(null);
  const [outcomeRate, setOutcomeRate] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uid = user?.uid ?? null;
  const userDocRef = useMemo(() => {
    if (!uid) return null;
    return doc(db, "users", uid);
  }, [uid]);

  function StatGauge(props: { value: string; label: string; progress: number; unit?: string }) {
    let progress = Math.max(0, Math.min(1, props.progress));
    progress = Math.max(0.08, Math.min(0.98, progress));

    const size = 112;
    const stroke = 10;
    const center = size / 2;
    const radius = center - stroke - 4;
    const segments = 36;
    const gapDeg = 3;
    const segDeg = 360 / segments - gapDeg;
    const filled = Math.max(0, Math.min(segments, Math.round(progress * segments)));

    const polar = (angleDeg: number) => {
      const a = ((angleDeg - 90) * Math.PI) / 180;
      return {
        x: center + radius * Math.cos(a),
        y: center + radius * Math.sin(a),
      };
    };

    const arcPath = (startDeg: number, endDeg: number) => {
      const start = polar(startDeg);
      const end = polar(endDeg);
      const largeArcFlag = endDeg - startDeg <= 180 ? 0 : 1;
      return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
    };

    return (
      <div style={{ display: "grid", justifyItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ position: "relative", width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block" }}>
            {Array.from({ length: segments }).map((_, i) => {
              const start = i * (segDeg + gapDeg);
              const end = start + segDeg;
              const isFilled = i < filled;
              return (
                <path
                  key={i}
                  d={arcPath(start, end)}
                  stroke={isFilled ? "#3b82f6" : "rgba(0,0,0,0.10)"}
                  strokeWidth={stroke}
                  fill="none"
                  strokeLinecap="butt"
                />
              );
            })}
          </svg>

          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <div style={{ display: "grid", gap: 4, placeItems: "center" }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(0,0,0,0.45)", letterSpacing: 0.2 }}>
                {props.label}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <div style={{ fontWeight: 900, fontSize: 30, lineHeight: "30px", color: "#3b82f6" }}>{props.value}</div>
                {props.unit ? <div style={{ fontWeight: 900, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>{props.unit}</div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  useEffect(() => {
    return subscribeAuth((u) => {
      setUser(u);
      setError(null);
    });
  }, []);

  useEffect(() => {
    if (!userDocRef) {
      setUserDoc(null);
      return;
    }

    return onSnapshot(userDocRef, (snap) => {
      if (!snap.exists()) {
        setUserDoc(null);
        return;
      }
      const data = snap.data() as UserDoc;
      setUserDoc(data);
    });
  }, [userDocRef]);

  useEffect(() => {
    async function run() {
      try {
        const snap = await getDocs(collection(db, "teams"));
        const map = new Map<string, TeamDoc>();
        for (const d of snap.docs) {
          map.set(d.id, d.data() as TeamDoc);
        }
        setTeams(map);
      } catch {
        setTeams(new Map());
      }
    }
    void run();
  }, []);

  useEffect(() => {
    async function run() {
      if (!uid) {
        setTotalPoints(null);
        setRanking(null);
        setTotalUsers(null);
        setPredictionCount(null);
        setPerfectRate(null);
        setOutcomeRate(null);
        return;
      }

      try {
        const statsSnap = await getDocs(query(collection(db, "userStats"), where("uid", "==", uid)));
        const statsDoc = statsSnap.docs[0]?.data() as { totalPoints?: number } | undefined;
        const tp = typeof statsDoc?.totalPoints === "number" ? statsDoc.totalPoints : null;
        setTotalPoints(tp);
      } catch {
        setTotalPoints(null);
      }

      try {
        const allStatsSnap = await getDocs(query(collection(db, "userStats"), orderBy("totalPoints", "desc")));
        setTotalUsers(allStatsSnap.docs.length);
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
        const umpSnap = await getDocs(query(collection(db, "userMatchPoints"), where("uid", "==", uid)));
        let sum = 0;
        for (const d of umpSnap.docs) {
          const data = d.data() as { points?: number };
          if (typeof data.points === "number") sum += data.points;
        }
        setTotalPoints((prev) => (typeof prev === "number" ? prev : sum));
      } catch {
        // keep totalPoints as-is
      }

      try {
        const predSnap = await getDocs(query(collection(db, "predictions"), where("uid", "==", uid)));
        const preds = predSnap.docs
          .map((d) => d.data() as { matchId?: string; homeScore?: number; awayScore?: number })
          .filter((p) => typeof p.matchId === "string" && typeof p.homeScore === "number" && typeof p.awayScore === "number")
          .map((p) => ({ matchId: p.matchId as string, homeScore: p.homeScore as number, awayScore: p.awayScore as number }));

        setPredictionCount(preds.length);

        const matchSnap = await getDocs(query(collection(db, "matches"), where("status", "==", "FINISHED")));
        const finished = new Map<string, MatchDoc>();
        for (const d of matchSnap.docs) {
          finished.set(d.id, d.data() as MatchDoc);
        }

        let eligible = 0;
        let perfect = 0;
        let outcome = 0;

        function outcomeKey(home: number, away: number): "H" | "D" | "A" {
          if (home > away) return "H";
          if (home < away) return "A";
          return "D";
        }

        for (const p of preds) {
          const m = finished.get(p.matchId);
          if (!m) continue;
          if (typeof m.homeScore !== "number" || typeof m.awayScore !== "number") continue;

          eligible += 1;
          if (m.homeScore === p.homeScore && m.awayScore === p.awayScore) perfect += 1;
          if (outcomeKey(m.homeScore, m.awayScore) === outcomeKey(p.homeScore, p.awayScore)) outcome += 1;
        }

        const perfectPct = eligible > 0 ? (perfect / eligible) * 100 : 0;
        const outcomePct = eligible > 0 ? (outcome / eligible) * 100 : 0;

        setPerfectRate(perfectPct);
        setOutcomeRate(outcomePct);
      } catch {
        setPredictionCount(null);
        setPerfectRate(null);
        setOutcomeRate(null);
      }
    }

    void run();
  }, [uid]);

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

  const championName = useMemo(() => {
    const id = userDoc?.championTeamId;
    if (!id) return null;
    return teams.get(id)?.nameJa ?? null;
  }, [teams, userDoc?.championTeamId]);

  function RankingGauge(props: { points: number | null; rank: number | null; total: number | null }) {
    const p = typeof props.points === "number" ? props.points : null;
    const r = typeof props.rank === "number" ? props.rank : null;
    const maxPoints = 6540;
    let progress = p != null ? p / maxPoints : 0;
    progress = Math.max(0, Math.min(1, progress));

    const size = 250;
    const stroke = 12;
    const center = size / 2;
    const radius = center - stroke - 6;
    const segments = 96;
    const gapDeg = 2;
    const segDeg = 360 / segments - gapDeg;
    const filled = Math.max(0, Math.min(segments, Math.round(progress * segments)));

    const polar = (angleDeg: number) => {
      const a = ((angleDeg - 90) * Math.PI) / 180;
      return {
        x: center + radius * Math.cos(a),
        y: center + radius * Math.sin(a),
      };
    };

    const arcPath = (startDeg: number, endDeg: number) => {
      const start = polar(startDeg);
      const end = polar(endDeg);
      const largeArcFlag = endDeg - startDeg <= 180 ? 0 : 1;
      return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
    };

    return (
      <div style={{ width: "min(420px, 100%)", display: "grid", justifyItems: "center" }}>
        <div style={{ position: "relative", width: size, height: size }}>
          <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block" }}>
            {Array.from({ length: segments }).map((_, i) => {
              const start = i * (segDeg + gapDeg);
              const end = start + segDeg;
              const isFilled = i < filled;
              return (
                <path
                  key={i}
                  d={arcPath(start, end)}
                  stroke={isFilled ? "#3b82f6" : "rgba(0,0,0,0.10)"}
                  strokeWidth={stroke}
                  fill="none"
                  strokeLinecap="butt"
                />
              );
            })}
          </svg>

          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "rgba(0,0,0,0.55)" }}>RANKING</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontWeight: 900, fontSize: 52, lineHeight: "52px", color: "#3b82f6" }}>
                  {p != null ? p.toLocaleString("ja-JP") : "-"}
                </div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "rgba(0,0,0,0.55)" }}>ポイント</div>
              </div>
              <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.55)", fontSize: 14 }}>
                {r != null ? `${r.toLocaleString("ja-JP")}位` : "-"}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div style={{ width: "100%", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/">← Home</Link>
            {uid ? <Link href="/me/edit">プロフィール編集</Link> : <div />}
          </div>

          <div
            style={{
              width: "100%",
              borderRadius: 22,
              padding: 20,
              background: "#fff",
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
              />
              <StatGauge
                value={typeof outcomeRate === "number" ? String(Math.round(outcomeRate)) : "-"}
                label="勝敗的中率"
                unit="%"
                progress={typeof outcomeRate === "number" ? outcomeRate / 100 : 0}
              />
              <StatGauge
                value={typeof predictionCount === "number" ? String(predictionCount) : "-"}
                label="予想試合数"
                progress={typeof predictionCount === "number" ? predictionCount / 104 : 0}
              />
            </div>
          </div>

          <div
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.98)",
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
                    <a href={userDoc.xUrl} target="_blank" rel="noreferrer" style={{ fontWeight: 900, fontSize: 32, color: "#000", textDecoration: "none" }}>
                      X
                    </a>
                  ) : (
                    <div style={{ fontWeight: 900, fontSize: 32, color: "rgba(0,0,0,0.18)" }}>X</div>
                  )}
                  {userDoc?.instagramUrl ? (
                    <a
                      href={userDoc.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontWeight: 900, fontSize: 30, color: "#e1306c", textDecoration: "none" }}
                    >
                      IG
                    </a>
                  ) : (
                    <div style={{ fontWeight: 900, fontSize: 30, color: "rgba(0,0,0,0.18)" }}>IG</div>
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

            {error ? <p style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>{error}</p> : null}
          </div>
        </div>

        <div className={styles.ctas}>
          <Link className={styles.secondary} href="/matches">
            予想（試合一覧）
          </Link>
          <Link className={styles.secondary} href="/results">
            大会結果
          </Link>
          <Link className={styles.secondary} href="/ranking">
            ランキング
          </Link>
          <Link className={styles.secondary} href="/admin/results">
            管理: 結果入力
          </Link>
          <Link className={styles.secondary} href="/admin/recalc">
            管理: 再集計
          </Link>
          {user ? (
            <button className={styles.secondary} onClick={onClickLogout}>
              ログアウト
            </button>
          ) : (
            <button className={styles.primary} onClick={onClickLogin}>
              Googleログイン
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
