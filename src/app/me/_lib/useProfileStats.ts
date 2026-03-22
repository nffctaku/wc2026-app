"use client";

import { collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { db } from "@/lib/firebase/client";
import type { UserDoc } from "@/lib/firebase/user";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

export default function useProfileStats(uid: string | null, opts?: { subscribeUserDoc?: boolean }) {
  const subscribeUserDoc = opts?.subscribeUserDoc ?? false;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userDocData, setUserDocData] = useState<UserDoc | null>(null);
  const [teams, setTeams] = useState<Map<string, TeamDoc>>(new Map());

  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [ranking, setRanking] = useState<number | null>(null);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [predictionCount, setPredictionCount] = useState<number | null>(null);
  const [perfectRate, setPerfectRate] = useState<number | null>(null);
  const [outcomeRate, setOutcomeRate] = useState<number | null>(null);

  const userDocRef = useMemo(() => {
    if (!uid) return null;
    return doc(db, "users", uid);
  }, [uid]);

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
    if (!userDocRef) {
      setUserDocData(null);
      return;
    }

    const ref = userDocRef;

    if (subscribeUserDoc) {
      return onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          setUserDocData(null);
          return;
        }
        setUserDocData(snap.data() as UserDoc);
      });
    }

    let cancelled = false;
    async function run() {
      try {
        const snap = await getDoc(ref);
        if (cancelled) return;
        setUserDocData(snap.exists() ? (snap.data() as UserDoc) : null);
      } catch {
        if (cancelled) return;
        setUserDocData(null);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [subscribeUserDoc, userDocRef]);

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

      setBusy(true);
      setError(null);
      try {
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
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, [uid]);

  return {
    busy,
    error,
    userDoc: userDocData,
    teams,
    totalPoints,
    ranking,
    totalUsers,
    predictionCount,
    perfectRate,
    outcomeRate,
  };
}
