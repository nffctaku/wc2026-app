"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

  const [relatedGroupMatches, setRelatedGroupMatches] = useState<RelatedMatchCard[]>([]);

  const [distribution, setDistribution] = useState<PredictionDistribution>({
    homeWinPct: 0,
    drawPct: 0,
    awayWinPct: 0,
    total: 0,
  });
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);

  const hydratedPredRef = useRef(false);
  const lastSavedRef = useRef<{ hs: number; as: number } | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (!resolvedMatchId || !match) {
        setRelatedGroupMatches([]);
        return;
      }
      if (!match.groupNameJa) {
        setRelatedGroupMatches([]);
        return;
      }

      try {
        const q = query(collection(db, "matches"), where("groupNameJa", "==", match.groupNameJa));
        const snap = await getDocs(q);
        const rows = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as MatchDoc) }))
          .filter((m) => m.id !== resolvedMatchId && m.stageNameJa === match.stageNameJa);

        rows.sort((a, b) => a.kickoffAt.toMillis() - b.kickoffAt.toMillis());

        const teamIds = new Set<string>();
        for (const m of rows) {
          teamIds.add(m.homeTeamId);
          teamIds.add(m.awayTeamId);
        }

        const teamIdList = Array.from(teamIds);
        const teamSnaps = await Promise.all(teamIdList.map((id) => getDoc(doc(db, "teams", id))));
        const teamsById = new Map<string, TeamDoc>();
        for (let i = 0; i < teamSnaps.length; i++) {
          const teamId = teamIdList[i]!;
          const s = teamSnaps[i]!;
          if (s.exists()) teamsById.set(teamId, s.data() as TeamDoc);
        }

        const cards: RelatedMatchCard[] = rows.map((m) => {
          const homeDoc = teamsById.get(m.homeTeamId) ?? null;
          const awayDoc = teamsById.get(m.awayTeamId) ?? null;
          const homeName = displayTeamName(homeDoc, m.homeTeamId);
          const awayName = displayTeamName(awayDoc, m.awayTeamId);
          const homeFlag = localFlagSrc(homeDoc);
          const awayFlag = localFlagSrc(awayDoc);
          const kickoffLabel = `${m.matchNumber} / ${formatTs(m.kickoffAt)}`;

          const scoreLabel =
            m.status === "FINISHED" && typeof m.homeScore === "number" && typeof m.awayScore === "number"
              ? `${m.homeScore}-${m.awayScore}`
              : undefined;

          return {
            id: m.id,
            kickoffLabel,
            homeName,
            awayName,
            homeFlag,
            awayFlag,
            status: m.status,
            scoreLabel,
          };
        });

        setRelatedGroupMatches(cards);
      } catch {
        setRelatedGroupMatches([]);
      }
    }

    void run();
  }, [match, resolvedMatchId]);

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
          setHomeScore(0);
          setAwayScore(0);
          lastSavedRef.current = { hs: 0, as: 0 };
          hydratedPredRef.current = true;
          return;
        }

        const p = snap.data() as PredictionDoc;
        const hs = typeof p.homeScore === "number" ? p.homeScore : 0;
        const as = typeof p.awayScore === "number" ? p.awayScore : 0;
        setHomeScore(hs);
        setAwayScore(as);
        lastSavedRef.current = { hs, as };
        hydratedPredRef.current = true;
      } catch (e) {
        setPredError(e instanceof Error ? e.message : String(e));
      } finally {
        setPredBusy(false);
      }
    }

    void run();
  }, [uid, resolvedMatchId]);

  useEffect(() => {
    hydratedPredRef.current = false;
    lastSavedRef.current = null;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, [uid, resolvedMatchId]);

  useEffect(() => {
    if (!resolvedMatchId) return;
    const ref = doc(db, "matchPredictionStats", resolvedMatchId);

    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setDistribution({ homeWinPct: 0, drawPct: 0, awayWinPct: 0, total: 0 });
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
        setDistribution({ homeWinPct: 0, drawPct: 0, awayWinPct: 0, total: 0 });
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

    const hs = homeScore;
    const as = awayScore;

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

  useEffect(() => {
    if (!uid || !resolvedMatchId || !match || !lockInfo) return;
    if (!hydratedPredRef.current) return;
    if (lockInfo.locked) return;
    if (predBusy) return;

    const last = lastSavedRef.current;
    if (last && last.hs === homeScore && last.as === awayScore) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void (async () => {
        await onSavePrediction();
        lastSavedRef.current = { hs: homeScore, as: awayScore };
      })();
    }, 600);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [awayScore, homeScore, lockInfo, match, predBusy, resolvedMatchId, uid]);

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
            distribution={distribution}

            lockedLabel={lockInfo ? (lockInfo.locked ? "締切済み" : "締切前") : ""}
            uid={uid}
            predError={predError}
            predBusy={predBusy}
            canEditPrediction={canEditPrediction}
            homeScore={homeScore}
            awayScore={awayScore}
            onHomeScoreChange={setHomeScore}
            onAwayScoreChange={setAwayScore}

            relatedGroupMatches={relatedGroupMatches}
          />
        </>
      ) : null}

      {predSaved ? (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 12,
            display: "flex",
            justifyContent: "center",
            paddingLeft: 12,
            paddingRight: 12,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              background: "rgba(9, 30, 15, 0.92)",
              color: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: 999,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 800,
              maxWidth: 520,
              width: "100%",
              textAlign: "center",
            }}
          >
            {predSaved}
          </div>
        </div>
      ) : null}
    </div>
  );
}
