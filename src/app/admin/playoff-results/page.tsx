"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, deleteField, doc, getDoc, getDocs, query, setDoc, Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";

import { playoffMatches } from "@/app/playoff/_lib/playoffMatches";

type ScoreDraft = {
  homeScore: string;
  awayScore: string;
};

type PlayoffMatchDoc = {
  kickoffAt?: Timestamp;
  status?: "SCHEDULED" | "FINISHED";
  homeScore?: number;
  awayScore?: number;
  label?: string;
  block?: string;
  homeName?: string;
  awayName?: string;
  homeCode?: string;
  awayCode?: string;
  resultUpdatedAt?: Timestamp;
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

export default function AdminPlayoffResultsPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");

  const [existingById, setExistingById] = useState<Map<string, PlayoffMatchDoc>>(new Map());
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
      setLog("Loading playoffMatches...\n");

      try {
        const snap = await getDocs(query(collection(db, "playoffMatches")));
        const m = new Map<string, PlayoffMatchDoc>();
        for (const d of snap.docs) {
          m.set(d.id, d.data() as PlayoffMatchDoc);
        }
        setExistingById(m);

        const nextDrafts: Record<string, ScoreDraft> = {};
        for (const pm of playoffMatches) {
          const cur = m.get(pm.id);
          nextDrafts[pm.id] = {
            homeScore: typeof cur?.homeScore === "number" ? String(cur.homeScore) : "",
            awayScore: typeof cur?.awayScore === "number" ? String(cur.awayScore) : "",
          };
        }
        setDrafts(nextDrafts);

        setLog((s) => s + `Loaded ${snap.size} docs\n`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, [uid, canEdit]);

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

    const base = playoffMatches.find((m) => m.id === matchId);
    if (!base) return;

    const draft = drafts[matchId] ?? { homeScore: "", awayScore: "" };

    const hsText = draft.homeScore.trim();
    const asText = draft.awayScore.trim();

    if (!hsText && !asText) {
      setBusy(true);
      setError(null);
      try {
        const kickoff = Timestamp.fromDate(new Date(base.kickoffAtIso));
        await setDoc(
          doc(db, "playoffMatches", matchId),
          {
            kickoffAt: kickoff,
            status: "SCHEDULED",
            homeScore: deleteField(),
            awayScore: deleteField(),
            resultUpdatedAt: deleteField(),
          },
          { merge: true }
        );

        setExistingById((prev) => {
          const next = new Map(prev);
          const cur = next.get(matchId) ?? {};
          next.set(matchId, {
            ...cur,
            kickoffAt: kickoff,
            status: "SCHEDULED",
            homeScore: undefined,
            awayScore: undefined,
            resultUpdatedAt: undefined,
          });
          return next;
        });

        setLog((s) => s + `Reset result for ${matchId}\n`);

        const recalc = httpsCallable<undefined, unknown>(functions, "recalcPlayoffPoints");
        await recalc(undefined);
        setLog((s) => s + `Recalculated playoff points\n`);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!hsText || !asText) {
      setError("スコアは両方入力するか、両方空でリセットしてください");
      return;
    }

    const hs = Number(hsText);
    const as = Number(asText);

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
      const kickoff = Timestamp.fromDate(new Date(base.kickoffAtIso));

      await setDoc(
        doc(db, "playoffMatches", matchId),
        {
          kickoffAt: kickoff,
          status: "FINISHED",
          homeScore: hs,
          awayScore: as,
          block: base.block,
          label: base.label,
          homeName: base.home,
          awayName: base.away,
          homeCode: base.homeCode ?? null,
          awayCode: base.awayCode ?? null,
          resultUpdatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      setExistingById((prev) => {
        const next = new Map(prev);
        next.set(matchId, {
          ...(next.get(matchId) ?? {}),
          kickoffAt: kickoff,
          status: "FINISHED",
          homeScore: hs,
          awayScore: as,
          block: base.block,
          label: base.label,
          homeName: base.home,
          awayName: base.away,
          homeCode: base.homeCode,
          awayCode: base.awayCode,
          resultUpdatedAt: Timestamp.now(),
        });
        return next;
      });

      setLog((s) => s + `Saved result for ${matchId}\n`);

      const recalc = httpsCallable<undefined, unknown>(functions, "recalcPlayoffPoints");
      await recalc(undefined);
      setLog((s) => s + `Recalculated playoff points\n`);
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
        <h1 style={{ margin: 0 }}>Admin Playoff Results</h1>
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
          <table style={{ borderCollapse: "collapse", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>ID</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>キックオフ</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>対戦</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>結果</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>状態</th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #ddd" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {playoffMatches.map((m) => {
                const cur = existingById.get(m.id);
                const draft = drafts[m.id] ?? { homeScore: "", awayScore: "" };
                const kickoffLabel = cur?.kickoffAt ? formatTs(cur.kickoffAt) : "";
                return (
                  <tr key={m.id}>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{m.id}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{kickoffLabel}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      {m.label} / ブロック{m.block} / {m.home} vs {m.away}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          value={draft.homeScore}
                          onChange={(e) => setDraft(m.id, { homeScore: e.target.value })}
                          style={{ width: 60, padding: 6 }}
                        />
                        <span>-</span>
                        <input
                          value={draft.awayScore}
                          onChange={(e) => setDraft(m.id, { awayScore: e.target.value })}
                          style={{ width: 60, padding: 6 }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{cur?.status ?? ""}</td>
                    <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                      <button onClick={() => void onSave(m.id)} disabled={busy}>
                        保存
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <div>
        <h3>Log</h3>
        <pre style={{ whiteSpace: "pre-wrap" }}>{log}</pre>
      </div>
    </div>
  );
}
