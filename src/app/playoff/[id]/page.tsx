"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, Timestamp } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

import MatchHero from "../../matches/[id]/_components/MatchHero";
import type { PredictionDistribution } from "../../matches/[id]/_components/PredictionDistributionBar";
import { formatKickoff, formatTs, localFlagSrc } from "../../matches/[id]/_lib/format";

import { getPlayoffMatch, playoffMatches, type PlayoffMatchId } from "../_lib/playoffMatches";

type PlayoffMatchResultDoc = {
  status?: "SCHEDULED" | "FINISHED";
  homeScore?: number;
  awayScore?: number;
  winner?: "HOME" | "AWAY";
};

type PlayoffPredictionDoc = {
  uid: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export default function PlayoffMatchPage() {
  const params = useParams<{ id: string | string[] }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;

  const playoff = useMemo(() => (routeId ? getPlayoffMatch(routeId) : null), [routeId]);

  const [resultsById, setResultsById] = useState<Map<string, PlayoffMatchResultDoc>>(new Map());

  const [teamsByCode, setTeamsByCode] = useState<Map<string, TeamDoc>>(new Map());

  const [uid, setUid] = useState<string | null>(null);
  const [predBusy, setPredBusy] = useState(false);
  const [predError, setPredError] = useState<string | null>(null);
  const [predSaved, setPredSaved] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);

  const hydratedPredRef = useRef(false);
  const lastSavedRef = useRef<{ hs: number; as: number } | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [distribution, setDistribution] = useState<PredictionDistribution>({
    homeWinPct: 0,
    drawPct: 0,
    awayWinPct: 0,
    total: 0,
  });

  useEffect(() => {
    return subscribeAuth((u) => {
      setUid(u?.uid ?? null);
      setPredSaved(null);
      setPredError(null);
    });
  }, []);

  useEffect(() => {
    async function run() {
      if (!playoff) {
        setResultsById(new Map());
        return;
      }
      try {
        const snap = await getDocs(collection(db, "playoffMatches"));
        const m = new Map<string, PlayoffMatchResultDoc>();
        for (const d of snap.docs) {
          m.set(d.id, d.data() as PlayoffMatchResultDoc);
        }
        setResultsById(m);
      } catch {
        setResultsById(new Map());
      }
    }
    void run();
  }, [playoff?.id]);

  useEffect(() => {
    async function run() {
      try {
        const snap = await getDocs(collection(db, "teams"));
        const m = new Map<string, TeamDoc>();
        for (const d of snap.docs) {
          const t = d.data() as TeamDoc;
          const code = t.code?.trim()?.toUpperCase();
          if (!code) continue;
          m.set(code, t);
        }
        setTeamsByCode(m);
      } catch {
        setTeamsByCode(new Map());
      }
    }
    void run();
  }, []);

  const resolvedPlayoff = useMemo(() => {
    if (!playoff) return null;

    const matchById = new Map<PlayoffMatchId, (typeof playoffMatches)[number]>(playoffMatches.map((m) => [m.id, m] as const));

    const winnerTeamByMatchId = (matchId: PlayoffMatchId): { name: string; code?: string } | null => {
      const meta = matchById.get(matchId);
      const res = resultsById.get(matchId);
      if (!meta || !res) return null;
      if (res.status !== "FINISHED") return null;
      if (typeof res.homeScore !== "number" || typeof res.awayScore !== "number") return null;
      if (res.homeScore === res.awayScore) {
        if (res.winner === "HOME") return { name: meta.home, code: meta.homeCode };
        if (res.winner === "AWAY") return { name: meta.away, code: meta.awayCode };
        return null;
      }

      if (res.homeScore > res.awayScore) return { name: meta.home, code: meta.homeCode };
      return { name: meta.away, code: meta.awayCode };
    };

    const finalRefs: Partial<Record<PlayoffMatchId, { homeFrom: PlayoffMatchId; awayFrom: PlayoffMatchId }>> = {
      A3: { homeFrom: "A2", awayFrom: "A1" },
      B3: { homeFrom: "B1", awayFrom: "B2" },
      C3: { homeFrom: "C2", awayFrom: "C1" },
      D3: { homeFrom: "D2", awayFrom: "D1" },
    };

    if (playoff.label !== "決勝") return playoff;
    const ref = finalRefs[playoff.id];
    if (!ref) return playoff;

    const homeWinner = winnerTeamByMatchId(ref.homeFrom);
    const awayWinner = winnerTeamByMatchId(ref.awayFrom);

    return {
      ...playoff,
      home: homeWinner?.name ?? playoff.home,
      away: awayWinner?.name ?? playoff.away,
      homeCode: homeWinner?.code ?? playoff.homeCode,
      awayCode: awayWinner?.code ?? playoff.awayCode,
    };
  }, [playoff, resultsById]);

  useEffect(() => {
    async function run() {
      hydratedPredRef.current = false;
      lastSavedRef.current = null;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      if (!uid || !playoff) {
        setHomeScore(0);
        setAwayScore(0);
        return;
      }
      setPredBusy(true);
      setPredError(null);
      setPredSaved(null);
      try {
        const predId = `${uid}_${playoff.id}`;
        const snap = await getDoc(doc(db, "playoffPredictions", predId));
        if (!snap.exists()) {
          setHomeScore(0);
          setAwayScore(0);
          lastSavedRef.current = { hs: 0, as: 0 };
          hydratedPredRef.current = true;
          return;
        }

        const p = snap.data() as PlayoffPredictionDoc;
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
  }, [uid, playoff?.id]);

  useEffect(() => {
    if (!playoff) {
      setDistribution({ homeWinPct: 0, drawPct: 0, awayWinPct: 0, total: 0 });
      return;
    }

    const ref = doc(db, "playoffMatchPredictionStats", playoff.id);

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
  }, [playoff?.id]);

  const matchDoc = useMemo((): MatchDoc | null => {
    if (!resolvedPlayoff) return null;

    const res = resultsById.get(resolvedPlayoff.id);
    const finished =
      res?.status === "FINISHED" && typeof res.homeScore === "number" && typeof res.awayScore === "number";

    const kickoff = new Date(resolvedPlayoff.kickoffAtIso);
    const lockAt = new Date(kickoff.getTime() - 30 * 60 * 1000);
    return {
      matchNumber: 0,
      stageNameJa: `プレーオフ / ブロック${resolvedPlayoff.block} / ${resolvedPlayoff.label}`,
      groupNameJa: "",
      kickoffAt: Timestamp.fromDate(kickoff),
      lockAt: Timestamp.fromDate(lockAt),
      homeTeamId: resolvedPlayoff.homeCode ? `PO_${resolvedPlayoff.homeCode}` : `PO_${resolvedPlayoff.id}_HOME`,
      awayTeamId: resolvedPlayoff.awayCode ? `PO_${resolvedPlayoff.awayCode}` : `PO_${resolvedPlayoff.id}_AWAY`,
      stadiumNameJa: "",
      cityNameJa: "",
      status: finished ? "FINISHED" : "SCHEDULED",
      homeScore: finished ? res.homeScore : undefined,
      awayScore: finished ? res.awayScore : undefined,
    };
  }, [resolvedPlayoff, resultsById]);

  const homeTeam = useMemo((): TeamDoc | null => {
    if (!resolvedPlayoff) return null;
    const code = resolvedPlayoff.homeCode?.trim()?.toUpperCase();
    const fromDb = code ? teamsByCode.get(code) : undefined;
    return {
      ...(fromDb ?? null),
      code: resolvedPlayoff.homeCode,
      nameJa: resolvedPlayoff.home,
      isPlaceholder: !resolvedPlayoff.homeCode,
    };
  }, [resolvedPlayoff, teamsByCode]);

  const awayTeam = useMemo((): TeamDoc | null => {
    if (!resolvedPlayoff) return null;
    const code = resolvedPlayoff.awayCode?.trim()?.toUpperCase();
    const fromDb = code ? teamsByCode.get(code) : undefined;
    return {
      ...(fromDb ?? null),
      code: resolvedPlayoff.awayCode,
      nameJa: resolvedPlayoff.away,
      isPlaceholder: !resolvedPlayoff.awayCode,
    };
  }, [resolvedPlayoff, teamsByCode]);

  const kickoffDate = useMemo(() => {
    if (!matchDoc) return null;
    return formatKickoff(matchDoc.kickoffAt);
  }, [matchDoc]);

  const homeFlag = useMemo(() => localFlagSrc(homeTeam), [homeTeam]);
  const awayFlag = useMemo(() => localFlagSrc(awayTeam), [awayTeam]);

  const relatedPlayoffMatches = useMemo(() => {
    if (!resolvedPlayoff) return [];

    const matchById = new Map<PlayoffMatchId, (typeof playoffMatches)[number]>(playoffMatches.map((m) => [m.id, m] as const));

    const winnerTeamByMatchId = (matchId: PlayoffMatchId): { name: string; code?: string } | null => {
      const meta = matchById.get(matchId);
      const res = resultsById.get(matchId);
      if (!meta || !res) return null;
      if (res.status !== "FINISHED") return null;
      if (typeof res.homeScore !== "number" || typeof res.awayScore !== "number") return null;
      if (res.homeScore === res.awayScore) {
        if (res.winner === "HOME") return { name: meta.home, code: meta.homeCode };
        if (res.winner === "AWAY") return { name: meta.away, code: meta.awayCode };
        return null;
      }

      if (res.homeScore > res.awayScore) return { name: meta.home, code: meta.homeCode };
      return { name: meta.away, code: meta.awayCode };
    };

    const finalRefs: Partial<Record<PlayoffMatchId, { homeFrom: PlayoffMatchId; awayFrom: PlayoffMatchId }>> = {
      A3: { homeFrom: "A2", awayFrom: "A1" },
      B3: { homeFrom: "B1", awayFrom: "B2" },
      C3: { homeFrom: "C2", awayFrom: "C1" },
      D3: { homeFrom: "D2", awayFrom: "D1" },
    };

    const resolveMatch = (m: (typeof playoffMatches)[number]) => {
      if (m.label !== "決勝") return m;
      const ref = finalRefs[m.id as PlayoffMatchId];
      if (!ref) return m;
      const homeWinner = winnerTeamByMatchId(ref.homeFrom as PlayoffMatchId);
      const awayWinner = winnerTeamByMatchId(ref.awayFrom as PlayoffMatchId);
      return {
        ...m,
        home: homeWinner?.name ?? m.home,
        away: awayWinner?.name ?? m.away,
        homeCode: homeWinner?.code ?? m.homeCode,
        awayCode: awayWinner?.code ?? m.awayCode,
      };
    };

    return playoffMatches
      .filter((m) => m.block === resolvedPlayoff.block && m.id !== resolvedPlayoff.id)
      .sort((a, b) => new Date(a.kickoffAtIso).getTime() - new Date(b.kickoffAtIso).getTime())
      .map((m) => {
        const resolved = resolveMatch(m);
        const kickoff = new Date(m.kickoffAtIso);
        const kickoffLabel = kickoff.toLocaleString("ja-JP", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        const homeFlag = resolved.homeCode ? `/国旗/${resolved.homeCode.toUpperCase()}.png` : null;
        const awayFlag = resolved.awayCode ? `/国旗/${resolved.awayCode.toUpperCase()}.png` : null;
        return {
          id: m.id,
          href: `/playoff/${encodeURIComponent(m.id)}`,
          kickoffLabel: `${m.label} / ${kickoffLabel}`,
          homeName: resolved.home,
          awayName: resolved.away,
          homeFlag,
          awayFlag,
          status: "SCHEDULED" as const,
        };
      });
  }, [resolvedPlayoff, resultsById]);

  const lockInfo = useMemo(() => {
    if (!matchDoc) return null;
    const now = new Date();
    const lockAt = matchDoc.lockAt.toDate();
    const locked = now.getTime() >= lockAt.getTime();
    return { now, lockAt, locked };
  }, [matchDoc]);

  const canEditPrediction = !!uid && !!matchDoc && !!lockInfo && !lockInfo.locked;

  async function onSavePrediction() {
    if (!uid || !playoff || !matchDoc || !lockInfo) return;
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
      const predId = `${uid}_${playoff.id}`;
      const ref = doc(db, "playoffPredictions", predId);
      const existing = await getDoc(ref);

      const nowTs = Timestamp.now();
      const base: Omit<PlayoffPredictionDoc, "createdAt"> & { createdAt?: Timestamp } = {
        uid,
        matchId: playoff.id,
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
    if (!uid || !playoff || !matchDoc || !lockInfo) return;
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
  }, [awayScore, homeScore, lockInfo, matchDoc, playoff, predBusy, uid]);

  async function onSharePrediction() {
    setShareStatus(null);
    try {
      if (!playoff) return;
      const url = typeof window !== "undefined" ? window.location.href : "";
      const scoreLabel = `${homeScore}-${awayScore}`;
      const text = `${playoff.home} ${scoreLabel} ${playoff.away}\n#WC2026`;
      const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(intentUrl, "_blank", "noopener,noreferrer");
      setShareStatus("Xの投稿画面を開きました");
    } catch {
      setShareStatus("共有に失敗しました");
    }
  }

  if (!playoff || !matchDoc) {
    return (
      <div style={{ padding: 18, fontWeight: 900 }}>
        試合が見つかりません
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12, minHeight: "100vh" }}>
      <MatchHero
        match={matchDoc}
        home={homeTeam}
        away={awayTeam}
        homeName={resolvedPlayoff?.home ?? playoff.home}
        awayName={resolvedPlayoff?.away ?? playoff.away}
        homeFlag={homeFlag}
        awayFlag={awayFlag}
        kickoff={kickoffDate}
        lockLabel={formatTs(matchDoc.kickoffAt)}
        kickoffMs={matchDoc.kickoffAt.toDate().getTime()}
        nowMs={lockInfo?.now.getTime()}
        distribution={distribution}
        backHref="/playoff"

        lockedLabel={lockInfo ? (lockInfo.locked ? "締切済み" : "締切前") : ""}
        uid={uid}
        predError={predError}
        predBusy={predBusy}
        canEditPrediction={canEditPrediction}
        homeScore={homeScore}
        awayScore={awayScore}
        onHomeScoreChange={setHomeScore}
        onAwayScoreChange={setAwayScore}

        onSharePrediction={onSharePrediction}
        shareStatus={shareStatus}

        relatedGroupMatches={relatedPlayoffMatches}
        relatedMatchesTitle="同じブロックの他の試合"
      />

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
