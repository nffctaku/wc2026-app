"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";
import { subscribeAuth } from "@/lib/firebase/auth";

type PredictionDoc = {
  uid: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

function localFlagSrc(team: TeamDoc | null): string | null {
  const code = team?.code?.trim();
  if (!code) return null;
  return `/国旗/${code.toUpperCase()}.png`;
}

function displayTeamName(team: TeamDoc | null, fallback: string): string {
  const code = team?.code?.trim()?.toUpperCase();
  const raw = team?.nameJa?.trim();
  if (code === "NZL" || raw === "New Zealand") return "ニュージーランド";
  return raw || fallback;
}

function formatTs(ts: Timestamp): string {
  const d = ts.toDate();
  return d.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MatchDetailPage() {
  const params = useParams<{ id: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [resolvedMatchId, setResolvedMatchId] = useState<string | null>(null);

  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchDoc | null>(null);
  const [home, setHome] = useState<TeamDoc | null>(null);
  const [away, setAway] = useState<TeamDoc | null>(null);

  const [predBusy, setPredBusy] = useState(false);
  const [predError, setPredError] = useState<string | null>(null);
  const [predSaved, setPredSaved] = useState<string | null>(null);
  const [homeScore, setHomeScore] = useState<string>("");
  const [awayScore, setAwayScore] = useState<string>("");

  useEffect(() => {
    return subscribeAuth((u) => {
      setUid(u?.uid ?? null);
      setPredSaved(null);
      setPredError(null);
    });
  }, []);

  useEffect(() => {
    async function run() {
      if (!routeId) return;
      setBusy(true);
      setError(null);
      try {
        let idToUse: string | null = null;

        const directSnap = await getDoc(doc(db, "matches", routeId));
        if (directSnap.exists()) {
          idToUse = routeId;
        } else {
          const asNumber = Number(routeId);
          if (Number.isInteger(asNumber) && asNumber > 0) {
            const q = query(
              collection(db, "matches"),
              where("matchNumber", "==", asNumber),
              limit(1)
            );
            const s = await getDocs(q);
            idToUse = s.docs[0]?.id ?? null;
          }
        }

        if (!idToUse) {
          setResolvedMatchId(null);
          setMatch(null);
          setHome(null);
          setAway(null);
          setError("試合が見つかりません");
          return;
        }

        setResolvedMatchId(idToUse);
        const matchSnap =
          idToUse === routeId ? directSnap : await getDoc(doc(db, "matches", idToUse));

        const m = matchSnap.data() as MatchDoc;
        setMatch(m);

        const [homeSnap, awaySnap] = await Promise.all([
          getDoc(doc(db, "teams", m.homeTeamId)),
          getDoc(doc(db, "teams", m.awayTeamId)),
        ]);

        setHome(homeSnap.exists() ? (homeSnap.data() as TeamDoc) : null);
        setAway(awaySnap.exists() ? (awaySnap.data() as TeamDoc) : null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, [routeId]);

  useEffect(() => {
    async function run() {
      if (!uid || !resolvedMatchId) return;
      setPredBusy(true);
      setPredError(null);
      setPredSaved(null);
      try {
        const predId = `${uid}_${resolvedMatchId}`;
        const snap = await getDoc(doc(db, "predictions", predId));
        if (!snap.exists()) {
          setHomeScore("");
          setAwayScore("");
          return;
        }

        const p = snap.data() as PredictionDoc;
        setHomeScore(String(p.homeScore));
        setAwayScore(String(p.awayScore));
      } catch (e) {
        setPredError(e instanceof Error ? e.message : String(e));
      } finally {
        setPredBusy(false);
      }
    }

    void run();
  }, [uid, resolvedMatchId]);

  const lockInfo = useMemo(() => {
    if (!match) return null;
    const now = new Date();
    const lockAt = match.lockAt.toDate();
    const locked = now.getTime() >= lockAt.getTime();
    return { now, lockAt, locked };
  }, [match]);

  const canEditPrediction = !!uid && !!match && !!lockInfo && !lockInfo.locked;

  async function onSavePrediction() {
    if (!uid || !resolvedMatchId || !match || !lockInfo) return;
    if (lockInfo.locked) {
      setPredError("締切後のため保存できません");
      return;
    }

    const hs = Number(homeScore);
    const as = Number(awayScore);

    if (!Number.isFinite(hs) || !Number.isFinite(as)) {
      setPredError("スコアは数値で入力してください");
      return;
    }
    if (hs < 0 || as < 0) {
      setPredError("スコアは0以上で入力してください");
      return;
    }

    setPredBusy(true);
    setPredError(null);
    setPredSaved(null);

    try {
      const predId = `${uid}_${resolvedMatchId}`;
      const ref = doc(db, "predictions", predId);
      const existing = await getDoc(ref);

      const nowTs = Timestamp.now();
      const base: Omit<PredictionDoc, "createdAt"> & { createdAt?: Timestamp } = {
        uid,
        matchId: resolvedMatchId,
        homeScore: hs,
        awayScore: as,
        updatedAt: nowTs,
      };

      if (!existing.exists()) {
        base.createdAt = nowTs;
      }

      await setDoc(ref, base, { merge: true });
      setPredSaved(`保存しました（${new Date().toLocaleString("ja-JP")}）`);
    } catch (e) {
      setPredError(e instanceof Error ? e.message : String(e));
    } finally {
      setPredBusy(false);
    }
  }

  const kickoffDate = useMemo(() => {
    if (!match) return null;
    const d = match.kickoffAt.toDate();
    const date = d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const time = d.toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { date, time };
  }, [match]);

  const homeName = useMemo(() => {
    if (!match) return "";
    return displayTeamName(home, match.homeTeamId);
  }, [home, match]);

  const awayName = useMemo(() => {
    if (!match) return "";
    return displayTeamName(away, match.awayTeamId);
  }, [away, match]);

  const homeFlag = useMemo(() => localFlagSrc(home), [home]);
  const awayFlag = useMemo(() => localFlagSrc(away), [away]);

  return (
    <div style={{ padding: 18, display: "grid", gap: 12 }}>
      {busy ? (
        <div style={{ padding: 18, borderRadius: 12, background: "rgba(255,255,255,0.92)", fontWeight: 800 }}>
          読込中...
        </div>
      ) : null}
      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}

      {match ? (
        <>
          <section
            style={{
              borderRadius: 18,
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
                <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                  <div style={{ fontWeight: 900, fontSize: 14 }}>{kickoffDate?.date ?? ""}</div>
                  <div style={{ fontWeight: 900, fontSize: 22, lineHeight: 1 }}>{kickoffDate?.time ?? ""}</div>
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
                  gridTemplateColumns: "1fr auto",
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
                <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.82)" }}>
                  LOCK {formatTs(match.lockAt)}
                </div>
              </div>
            </div>
          </section>

          <section style={{ borderRadius: 12, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(0,0,0,0.10)", padding: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>スコア予想</div>
              <div style={{ fontSize: 12, color: "rgba(0,0,0,0.60)", fontWeight: 700 }}>
                {lockInfo ? (lockInfo.locked ? "締切済み" : "締切前") : ""}
              </div>
            </div>

            {!uid ? <div style={{ marginTop: 8, fontSize: 13 }}>予想の入力にはログインが必要です</div> : null}
            {predError ? <pre style={{ color: "#b00020", margin: "8px 0 0" }}>{predError}</pre> : null}
            {predSaved ? <pre style={{ color: "#1b5e20", margin: "8px 0 0" }}>{predSaved}</pre> : null}
            {predBusy ? <div style={{ marginTop: 8, fontSize: 13 }}>予想を読込/保存中...</div> : null}

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 8, alignItems: "end" }}>
              <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {homeName}
                </div>
                <input
                  inputMode="numeric"
                  value={homeScore}
                  onChange={(e) => setHomeScore(e.target.value)}
                  disabled={!canEditPrediction || predBusy}
                  style={{ padding: 10, width: "100%", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)" }}
                />
              </label>

              <div style={{ paddingBottom: 10, fontWeight: 900 }}>:</div>

              <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {awayName}
                </div>
                <input
                  inputMode="numeric"
                  value={awayScore}
                  onChange={(e) => setAwayScore(e.target.value)}
                  disabled={!canEditPrediction || predBusy}
                  style={{ padding: 10, width: "100%", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)" }}
                />
              </label>

              <button
                onClick={onSavePrediction}
                disabled={!canEditPrediction || predBusy}
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "0",
                  background: canEditPrediction && !predBusy ? "#f39c33" : "#c9c9c9",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: canEditPrediction && !predBusy ? "pointer" : "not-allowed",
                }}
              >
                保存
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
