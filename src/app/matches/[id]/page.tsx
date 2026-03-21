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
  onSnapshot,
  query,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";
import { subscribeAuth } from "@/lib/firebase/auth";

import MatchHero from "./_components/MatchHero";
import PredictionCard from "./_components/PredictionCard";
import { displayTeamName, formatKickoff, formatTs, localFlagSrc } from "./_lib/format";
import type { PredictionDistribution } from "./_components/PredictionDistributionBar";

type PredictionDoc = {
  uid: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

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

  const [distribution, setDistribution] = useState<PredictionDistribution | null>(null);
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

  useEffect(() => {
    if (!resolvedMatchId) return;
    const ref = doc(db, "matchPredictionStats", resolvedMatchId);

    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setDistribution(null);
          return;
        }
        const d = snap.data() as Partial<{
          homeWin: number;
          draw: number;
          awayWin: number;
          total: number;
        }>;

        const total = typeof d.total === "number" ? d.total : 0;
        const homeWin = typeof d.homeWin === "number" ? d.homeWin : 0;
        const draw = typeof d.draw === "number" ? d.draw : 0;
        const awayWin = typeof d.awayWin === "number" ? d.awayWin : 0;

        const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
        setDistribution({
          homeWinPct: pct(homeWin),
          drawPct: pct(draw),
          awayWinPct: pct(awayWin),
          total,
        });
      },
      () => {
        setDistribution(null);
      }
    );
  }, [resolvedMatchId]);

  const lockInfo = useMemo(() => {
    if (!match) return null;
    const now = new Date();
    const lockAt = match.kickoffAt.toDate();
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
    return formatKickoff(match.kickoffAt);
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
    <div style={{ display: "grid", gap: 12, minHeight: "100vh" }}>
      {busy ? (
        <div style={{ padding: 18, fontWeight: 800 }}>
          読込中...
        </div>
      ) : null}
      {error ? <pre style={{ color: "#b00020", padding: 18 }}>{error}</pre> : null}

      {match ? (
        <>
          <MatchHero
            match={match}
            home={home}
            away={away}
            homeName={homeName}
            awayName={awayName}
            homeFlag={homeFlag}
            awayFlag={awayFlag}
            kickoff={kickoffDate}
            lockLabel={formatTs(match.kickoffAt)}
            kickoffMs={match.kickoffAt.toDate().getTime()}
            nowMs={lockInfo?.now.getTime()}
            distribution={distribution && distribution.total > 0 ? distribution : null}
          />

          <div style={{ padding: 18 }}>
            <PredictionCard
              lockedLabel={lockInfo ? (lockInfo.locked ? "締切済み" : "締切前") : ""}
              uid={uid}
              predError={predError}
              predSaved={predSaved}
              predBusy={predBusy}
              canEditPrediction={canEditPrediction}
              homeName={homeName}
              awayName={awayName}
              homeScore={homeScore}
              awayScore={awayScore}
              onHomeScoreChange={setHomeScore}
              onAwayScoreChange={setAwayScore}
              onSavePrediction={onSavePrediction}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
