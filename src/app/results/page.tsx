"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";
import type { MatchRow, ThirdPlaceRow } from "./_lib/standings";
import { computeStandings } from "./_lib/standings";
import GroupStandings from "./_components/GroupStandings";
import ThirdPlaceRanking from "./_components/ThirdPlaceRanking";

export default function ResultsPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teams, setTeams] = useState<Map<string, TeamDoc>>(new Map());
  const [uid, setUid] = useState<string | null>(null);
  const [pointsByMatchId, setPointsByMatchId] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    return subscribeAuth((u) => setUid(u?.uid ?? null));
  }, []);

  useEffect(() => {
    async function run() {
      setBusy(true);
      setError(null);
      try {
        const q = query(collection(db, "matches"), orderBy("kickoffAt", "desc"));
        const [teamSnap, matchSnap] = await Promise.all([
          getDocs(collection(db, "teams")),
          getDocs(q),
        ]);

        const teamMap = new Map<string, TeamDoc>();
        for (const docSnap of teamSnap.docs) {
          teamMap.set(docSnap.id, docSnap.data() as TeamDoc);
        }

        const matchRows: MatchRow[] = matchSnap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as MatchDoc),
          }))
          .filter((m) => {
            const stage = typeof m.stageNameJa === "string" ? m.stageNameJa : "";
            const group = typeof m.groupNameJa === "string" ? m.groupNameJa : "";
            return stage.includes("グループ") || group.includes("グループ");
          });

        setTeams(teamMap);
        setMatches(matchRows);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, []);

  useEffect(() => {
    async function run() {
      if (!uid) {
        setPointsByMatchId(new Map());
        return;
      }
      try {
        const q = query(collection(db, "userMatchPoints"), where("uid", "==", uid));
        const snap = await getDocs(q);
        const m = new Map<string, number>();
        for (const d of snap.docs) {
          const data = d.data() as { matchId?: string; points?: number };
          if (typeof data.matchId === "string" && typeof data.points === "number") {
            m.set(data.matchId, data.points);
          }
        }
        setPointsByMatchId(m);
      } catch {
        setPointsByMatchId(new Map());
      }
    }

    void run();
  }, [uid]);

  const standingsGroups = useMemo(() => {
    return computeStandings(matches, teams);
  }, [matches, teams]);

  const displayStandingsGroups = useMemo(() => {
    return standingsGroups.filter((g) => g.groupNameJa !== "グループ未定");
  }, [standingsGroups]);

  const thirdPlaceRanking = useMemo(() => {
    const rows: ThirdPlaceRow[] = [];

    for (const g of standingsGroups) {
      if (g.groupNameJa === "グループ未定") continue;
      const third = g.teams[2];
      if (!third) continue;
      rows.push({ groupNameJa: g.groupNameJa, team: third });
    }

    rows.sort((a, b) => {
      if (b.team.pts !== a.team.pts) return b.team.pts - a.team.pts;
      if (b.team.gd !== a.team.gd) return b.team.gd - a.team.gd;
      if (b.team.gf !== a.team.gf) return b.team.gf - a.team.gf;
      return a.team.teamLabel.localeCompare(b.team.teamLabel, "ja");
    });

    return rows;
  }, [standingsGroups]);

  const groupMatches = useMemo(() => {
    const map = new Map<string, MatchRow[]>();
    for (const m of matches) {
      const group = m.groupNameJa && m.groupNameJa.trim() ? m.groupNameJa.trim() : "グループ未定";
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(m);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => a.kickoffAt.toMillis() - b.kickoffAt.toMillis());
      map.set(k, list);
    }
    return map;
  }, [matches]);

  const ready = teams.size > 0 && matches.length > 0;

  return (
    <div
      style={{
        padding: 24,
        display: "grid",
        gap: 12,
        position: "relative",
        minHeight: "100vh",
        backgroundImage: "url('/国旗/背景１.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.12)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1, display: "grid", gap: 12 }}>
        <div className="resultsDesktopNav">
          <Link href="/">← Home</Link>
          <h1 style={{ margin: 0 }}>大会結果</h1>
        </div>

        <div className="resultsMobileStageTag">グループステージ</div>

        {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}

        {!ready && !error ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 260,
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(255,255,255,0.92)",
              fontWeight: 800,
            }}
          >
            読込中...
          </div>
        ) : null}

        {ready ? (
          <>
            <GroupStandings
              displayStandingsGroups={displayStandingsGroups}
              teams={teams}
              groupMatches={groupMatches}
              pointsByMatchId={pointsByMatchId}
            />

            <ThirdPlaceRanking thirdPlaceRanking={thirdPlaceRanking} teams={teams} />
          </>
        ) : null}
      </div>
    </div>
  );
}
