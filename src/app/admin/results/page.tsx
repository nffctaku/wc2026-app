"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

type MatchRow = MatchDoc & { id: string };

type ScoreDraft = {
  homeScore: string;
  awayScore: string;
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

export default function AdminResultsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");

  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [teams, setTeams] = useState<Map<string, TeamDoc>>(new Map());
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({});

  const canEdit = useMemo(() => role === "ADMIN", [role]);

  useEffect(() => {
    return subscribeAuth((u) => {
      setUid(u?.uid ?? null);
      setRole(null);
      setError(null);
      setLog("");
    });
  }, []);

  useEffect(() => {
    async function run() {
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      setRole((snap.data() as { role?: string } | undefined)?.role ?? null);
    }
    void run();
  }, [uid]);

  useEffect(() => {
    async function run() {
      if (!uid || !canEdit) return;
      setBusy(true);
      setError(null);
      setLog("Loading matches/teams...\n");

      try {
        const teamSnap = await getDocs(collection(db, "teams"));
        const teamMap = new Map<string, TeamDoc>();
        for (const docSnap of teamSnap.docs) {
          teamMap.set(docSnap.id, docSnap.data() as TeamDoc);
        }
        setTeams(teamMap);

        const q = query(collection(db, "matches"), orderBy("kickoffAt", "asc"));
        const matchSnap = await getDocs(q);
        const rows: MatchRow[] = matchSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as MatchDoc),
        }));
        setMatches(rows);

        const nextDrafts: Record<string, ScoreDraft> = {};
        for (const m of rows) {
          nextDrafts[m.id] = {
            homeScore:
              typeof m.homeScore === "number" ? String(m.homeScore) : "",
            awayScore:
              typeof m.awayScore === "number" ? String(m.awayScore) : "",
          };
        }
        setDrafts(nextDrafts);
        setLog((s) => s + `Loaded ${rows.length} matches\n`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, [uid, canEdit]);

  function teamName(teamId: string): string {
    return teams.get(teamId)?.nameJa ?? teamId;
  }

  function setDraft(matchId: string, part: Partial<ScoreDraft>) {
    setDrafts((d) => ({
      ...d,
      [matchId]: {
        homeScore: d[matchId]?.homeScore ?? "",
        awayScore: d[matchId]?.awayScore ?? "",
        ...part,
      },
    }));
  }

  async function onSave(matchId: string) {
    if (!canEdit) return;
    const m = matches.find((x) => x.id === matchId);
    if (!m) return;

    const draft = drafts[matchId] ?? { homeScore: "", awayScore: "" };
    const hs = Number(draft.homeScore);
    const as = Number(draft.awayScore);

    if (!Number.isFinite(hs) || !Number.isFinite(as)) {
      setError("スコアは数値で入力してください");
      return;
    }
    if (hs < 0 || as < 0) {
      setError("スコアは0以上で入力してください");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await setDoc(
        doc(db, "matches", matchId),
        {
          homeScore: hs,
          awayScore: as,
          status: "FINISHED",
          resultUpdatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      setMatches((rows) =>
        rows.map((r) =>
          r.id === matchId
            ? { ...r, homeScore: hs, awayScore: as, status: "FINISHED" }
            : r
        )
      );

      setLog((s) => s + `Saved result for ${matchId}\n`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ margin: 0 }}>Admin Results</h1>
      </div>

      <p>Role: {role ?? "(unknown)"}</p>
      {!uid ? <p>ログインしてください</p> : null}
      {uid && !canEdit ? (
        <p>
          ADMIN権限が必要です。Firestoreの `users/{uid}.role` を `ADMIN` にして
          ください。
        </p>
      ) : null}

      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}
      {busy ? <p>処理中...</p> : null}

      {canEdit ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                  No
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                  キックオフ
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                  対戦
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                  結果
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                  状態
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => {
                const d = drafts[m.id] ?? { homeScore: "", awayScore: "" };
                return (
                  <tr key={m.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.matchNumber}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{formatTs(m.kickoffAt)}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      <Link href={`/matches/${m.id}`}>
                        {teamName(m.homeTeamId)} vs {teamName(m.awayTeamId)}
                      </Link>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          inputMode="numeric"
                          value={d.homeScore}
                          onChange={(e) => setDraft(m.id, { homeScore: e.target.value })}
                          style={{ padding: 6, width: 70 }}
                          disabled={busy}
                        />
                        <span>:</span>
                        <input
                          inputMode="numeric"
                          value={d.awayScore}
                          onChange={(e) => setDraft(m.id, { awayScore: e.target.value })}
                          style={{ padding: 6, width: 70 }}
                          disabled={busy}
                        />
                      </div>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{m.status}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      <button onClick={() => onSave(m.id)} disabled={busy}>
                        保存して確定
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <pre style={{ whiteSpace: "pre-wrap" }}>{log}</pre>
    </div>
  );
}
