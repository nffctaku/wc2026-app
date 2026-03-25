"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  orderBy,
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

type MatchCommentDoc = {
  uid: string;
  matchId: string;
  text: string;
  createdAt: Timestamp;
};

type MatchCommentRow = MatchCommentDoc & { id: string };

type CommentReactionState = {
  count: number;
  me: boolean;
};

type PublicUserDoc = {
  nickname?: string;
  photoURL?: string | null;
  idNo?: number | null;
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
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  const [relatedGroupMatches, setRelatedGroupMatches] = useState<RelatedMatchCard[]>([]);

  const [comments, setComments] = useState<MatchCommentRow[]>([]);
  const [commentDraft, setCommentDraft] = useState<string>("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentUsers, setCommentUsers] = useState<Map<string, PublicUserDoc>>(new Map());
  const [commentReactions, setCommentReactions] = useState<Map<string, CommentReactionState>>(new Map());

  const commentReactionUnsubsRef = useRef<Map<string, () => void>>(new Map());

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

  const groupSlideRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return subscribeAuth((u) => {
      setUid(u?.uid ?? null);
      setPredSaved(null);
      setPredError(null);
    });
  }, []);

  useEffect(() => {
    setCommentError(null);
  }, [uid]);

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

  useEffect(() => {
    if (!resolvedMatchId) {
      setComments([]);
      return;
    }

    const q = query(
      collection(db, "matchComments", resolvedMatchId, "comments"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    return onSnapshot(
      q,
      (snap) => {
        const rows: MatchCommentRow[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as MatchCommentDoc),
        }));
        setComments(rows);
      },
      (e) => {
        setCommentError(e instanceof Error ? e.message : String(e));
        setComments([]);
      }
    );
  }, [resolvedMatchId]);

  useEffect(() => {
    async function run() {
      if (comments.length === 0) return;
      const uidSet = new Set<string>();
      for (const c of comments) {
        if (typeof c.uid === "string" && c.uid) uidSet.add(c.uid);
      }
      const uidList = Array.from(uidSet);
      if (uidList.length === 0) return;

      const missing = uidList.filter((u) => !commentUsers.has(u));
      if (missing.length === 0) return;

      try {
        const snaps = await Promise.all(missing.map((u) => getDoc(doc(db, "publicUsers", u))));
        setCommentUsers((prev) => {
          const next = new Map(prev);
          for (let i = 0; i < missing.length; i++) {
            const u = missing[i]!;
            const s = snaps[i]!;
            if (s.exists()) next.set(u, s.data() as PublicUserDoc);
            else next.set(u, {});
          }
          return next;
        });
      } catch {
        // ignore
      }
    }

    void run();
  }, [comments, commentUsers]);

  useEffect(() => {
    if (!resolvedMatchId) {
      setCommentReactions(new Map());
      return;
    }

    const active = new Set<string>(comments.map((c) => c.id));

    for (const [commentId, unsub] of commentReactionUnsubsRef.current) {
      if (!active.has(commentId)) {
        unsub();
        commentReactionUnsubsRef.current.delete(commentId);
      }
    }

    for (const c of comments) {
      if (commentReactionUnsubsRef.current.has(c.id)) continue;

      const q = query(collection(db, "matchComments", resolvedMatchId, "comments", c.id, "reactions"));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const count = snap.size;
          const me = !!uid && snap.docs.some((d) => d.id === uid);
          setCommentReactions((prev) => {
            const next = new Map(prev);
            next.set(c.id, { count, me });
            return next;
          });
        },
        () => {
          setCommentReactions((prev) => {
            const next = new Map(prev);
            next.set(c.id, { count: 0, me: false });
            return next;
          });
        }
      );

      commentReactionUnsubsRef.current.set(c.id, unsub);
    }

    return () => {
      for (const [, unsub] of commentReactionUnsubsRef.current) unsub();
      commentReactionUnsubsRef.current.clear();
    };
  }, [comments, resolvedMatchId, uid]);

  const lockInfo = useMemo(() => {
    if (!match) return null;
    const now = new Date();
    const lockAt = match.kickoffAt.toDate();
    const locked = now.getTime() >= lockAt.getTime();
    return { now, lockAt, locked };
  }, [match]);

  const canEditPrediction = !!uid && !!match && !!lockInfo && !lockInfo.locked;

  async function onPostComment() {
    if (!uid || !resolvedMatchId) {
      setCommentError("ログインが必要です");
      return;
    }
    const text = commentDraft.trim();
    if (!text) return;
    if (text.length > 280) {
      setCommentError("コメントは280文字以内にしてください");
      return;
    }

    setCommentBusy(true);
    setCommentError(null);
    try {
      await addDoc(collection(db, "matchComments", resolvedMatchId, "comments"), {
        uid,
        matchId: resolvedMatchId,
        text,
        createdAt: Timestamp.now(),
      } satisfies MatchCommentDoc);
      setCommentDraft("");
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : String(e));
    } finally {
      setCommentBusy(false);
    }
  }

  async function onDeleteComment(commentId: string, commentUid: string) {
    if (!uid || !resolvedMatchId) return;
    if (uid !== commentUid) return;
    try {
      await deleteDoc(doc(db, "matchComments", resolvedMatchId, "comments", commentId));
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onToggleReaction(commentId: string) {
    if (!uid || !resolvedMatchId) return;
    const state = commentReactions.get(commentId);
    try {
      if (state?.me) {
        await deleteDoc(doc(db, "matchComments", resolvedMatchId, "comments", commentId, "reactions", uid));
      } else {
        await setDoc(doc(db, "matchComments", resolvedMatchId, "comments", commentId, "reactions", uid), {
          createdAt: Timestamp.now(),
        });
      }
    } catch (e) {
      setCommentError(e instanceof Error ? e.message : String(e));
    }
  }

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

  async function onSharePrediction() {
    setShareStatus(null);
    try {
      if (!match) return;
      const url = typeof window !== "undefined" ? window.location.href : "";
      const scoreLabel = `${homeScore}-${awayScore}`;
      const text = `${homeName} ${scoreLabel} ${awayName}\n#WC2026`;
      const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
      window.open(intentUrl, "_blank", "noopener,noreferrer");
      setShareStatus("Xの投稿画面を開きました");
    } catch {
      setShareStatus("共有に失敗しました");
    }
  }

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

            onSharePrediction={onSharePrediction}
            shareStatus={shareStatus}
          />

          <section style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => groupSlideRef.current?.scrollTo({ left: 0, behavior: "smooth" })}
                style={{
                  flex: "1 1 0",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "#0b1f3a",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                コメント
              </button>
              <button
                type="button"
                onClick={() => groupSlideRef.current?.scrollTo({ left: groupSlideRef.current?.clientWidth ?? 0, behavior: "smooth" })}
                style={{
                  flex: "1 1 0",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.18)",
                  background: "#fff",
                  color: "#0b1f3a",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                他の試合
              </button>
            </div>

            <div
              ref={groupSlideRef}
              style={{
                display: "grid",
                gridAutoFlow: "column",
                gridAutoColumns: "100%",
                overflowX: "auto",
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.10)",
              }}
            >
              <div style={{ scrollSnapAlign: "start", padding: 12, display: "grid", gap: 10, background: "rgba(255,255,255,0.60)" }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>コメント</div>

                {commentError ? <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#b00020" }}>{commentError}</pre> : null}

                <div style={{ display: "grid", gap: 8 }}>
                  <textarea
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder={uid ? "コメントを書く（280文字まで）" : "ログインするとコメントできます"}
                    disabled={!uid || commentBusy}
                    rows={3}
                    style={{
                      width: "100%",
                      resize: "vertical",
                      padding: 10,
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.18)",
                      fontWeight: 700,
                      background: "rgba(255,255,255,0.92)",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(0,0,0,0.55)" }}>{commentDraft.trim().length}/280</div>
                    <button
                      type="button"
                      onClick={() => void onPostComment()}
                      disabled={!uid || commentBusy || !commentDraft.trim()}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.18)",
                        background: "#0b1f3a",
                        color: "#fff",
                        fontWeight: 900,
                        cursor: !uid || commentBusy ? "not-allowed" : "pointer",
                      }}
                    >
                      {commentBusy ? "送信中..." : "投稿"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {comments.length === 0 ? (
                    <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(0,0,0,0.55)" }}>まだコメントがありません</div>
                  ) : null}

                  {comments.map((c) => {
                    const u = commentUsers.get(c.uid);
                    const name = (u?.nickname ?? "").trim() || `User`;
                    const timeLabel = c.createdAt ? c.createdAt.toDate().toLocaleString("ja-JP") : "";
                    const r = commentReactions.get(c.id) ?? { count: 0, me: false };
                    return (
                      <div
                        key={c.id}
                        style={{
                          border: "1px solid rgba(0,0,0,0.10)",
                          borderRadius: 12,
                          padding: 10,
                          background: "rgba(255,255,255,0.92)",
                          display: "grid",
                          gap: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            {u?.photoURL ? (
                              <img
                                src={u.photoURL}
                                alt=""
                                width={28}
                                height={28}
                                style={{ width: 28, height: 28, borderRadius: 999, objectFit: "cover" }}
                              />
                            ) : (
                              <div style={{ width: 28, height: 28, borderRadius: 999, background: "rgba(0,0,0,0.10)" }} />
                            )}
                            <div style={{ fontWeight: 900, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(0,0,0,0.55)" }}>{timeLabel}</div>
                            <button
                              type="button"
                              onClick={() => void onToggleReaction(c.id)}
                              disabled={!uid}
                              style={{
                                border: "1px solid rgba(0,0,0,0.18)",
                                background: r.me ? "rgba(255, 215, 0, 0.20)" : "transparent",
                                borderRadius: 10,
                                padding: "6px 8px",
                                fontWeight: 900,
                                fontSize: 12,
                                cursor: uid ? "pointer" : "not-allowed",
                              }}
                            >
                              🎉 {r.count}
                            </button>
                            {uid && uid === c.uid ? (
                              <button
                                type="button"
                                onClick={() => void onDeleteComment(c.id, c.uid)}
                                style={{
                                  border: "1px solid rgba(0,0,0,0.18)",
                                  background: "transparent",
                                  borderRadius: 10,
                                  padding: "6px 8px",
                                  fontWeight: 900,
                                  fontSize: 12,
                                  cursor: "pointer",
                                }}
                              >
                                削除
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontWeight: 700, fontSize: 13 }}>{c.text}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ scrollSnapAlign: "start", padding: 12, display: "grid", gap: 10, background: "rgba(255,255,255,0.60)" }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>同じグループの他の試合</div>

                {relatedGroupMatches.length === 0 ? (
                  <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(0,0,0,0.55)" }}>対象の試合がありません</div>
                ) : null}

                <div style={{ display: "grid", gap: 8 }}>
                  {relatedGroupMatches.map((m) => (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        background: "rgba(255,255,255,0.92)",
                        border: "1px solid rgba(0,0,0,0.10)",
                        borderRadius: 12,
                        padding: 10,
                        display: "grid",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, color: "rgba(0,0,0,0.55)", fontWeight: 800 }}>
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.kickoffLabel}</div>
                        <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.70)" }}>{m.status === "FINISHED" ? "試合終了" : ""}</div>
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
                        <div style={{ fontWeight: 900, color: "rgba(0,0,0,0.70)" }}>{m.scoreLabel ?? "vs"}</div>
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
            </div>
          </section>
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
