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

  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/matches">← 試合一覧へ</Link>
        <h1 style={{ margin: 0 }}>試合詳細</h1>
      </div>

      {busy ? <p>読込中...</p> : null}
      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}

      {match ? (
        <div style={{ display: "grid", gap: 8 }}>
          <p style={{ margin: 0 }}>
            <b>No:</b> {match.matchNumber}
          </p>
          <p style={{ margin: 0 }}>
            <b>対戦:</b> {(home?.nameJa ?? match.homeTeamId) + " vs " + (away?.nameJa ?? match.awayTeamId)}
          </p>
          {match.status === "FINISHED" &&
          typeof match.homeScore === "number" &&
          typeof match.awayScore === "number" ? (
            <p style={{ margin: 0 }}>
              <b>結果:</b> {match.homeScore}-{match.awayScore}
            </p>
          ) : null}
          <p style={{ margin: 0 }}>
            <b>キックオフ:</b> {formatTs(match.kickoffAt)}
          </p>
          <p style={{ margin: 0 }}>
            <b>ロック:</b> {formatTs(match.lockAt)}
          </p>
          <p style={{ margin: 0 }}>
            <b>ステージ:</b> {match.stageNameJa}
          </p>
          <p style={{ margin: 0 }}>
            <b>グループ:</b> {match.groupNameJa}
          </p>
          <p style={{ margin: 0 }}>
            <b>会場:</b> {match.cityNameJa} / {match.stadiumNameJa}
          </p>
          <p style={{ margin: 0 }}>
            <b>状態:</b> {match.status}
          </p>

          {lockInfo ? (
            <p style={{ margin: 0 }}>
              <b>予想編集:</b> {lockInfo.locked ? "締切済み" : "可能"}
              {" "}
              <span style={{ color: "#666" }}>
                （現在: {lockInfo.now.toLocaleString("ja-JP")}）
              </span>
            </p>
          ) : null}

          <hr style={{ border: 0, borderTop: "1px solid #ddd", margin: "12px 0" }} />

          <h2 style={{ margin: 0 }}>スコア予想</h2>
          {!uid ? <p style={{ margin: 0 }}>予想の入力にはログインが必要です</p> : null}
          {predError ? <pre style={{ color: "#b00020", margin: 0 }}>{predError}</pre> : null}
          {predSaved ? <pre style={{ color: "#1b5e20", margin: 0 }}>{predSaved}</pre> : null}
          {predBusy ? <p style={{ margin: 0 }}>予想を読込/保存中...</p> : null}

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span>{home?.nameJa ?? match.homeTeamId}</span>
              <input
                inputMode="numeric"
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                disabled={!canEditPrediction || predBusy}
                style={{ padding: 8, width: 120 }}
              />
            </label>

            <span>:</span>

            <label style={{ display: "grid", gap: 4 }}>
              <span>{away?.nameJa ?? match.awayTeamId}</span>
              <input
                inputMode="numeric"
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                disabled={!canEditPrediction || predBusy}
                style={{ padding: 8, width: 120 }}
              />
            </label>

            <button
              onClick={onSavePrediction}
              disabled={!canEditPrediction || predBusy}
              style={{ padding: "10px 14px" }}
            >
              保存
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
