"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, writeBatch } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";
import { fetchFifaMatches } from "@/lib/fifa/api";
import { normalizeMatches } from "@/lib/fifa/normalize";

export default function AdminImportPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeAuth((u) => {
      setUid(u?.uid ?? null);
      setRole(null);
      setError(null);
    });
  }, []);

  const canImport = useMemo(() => role === "ADMIN", [role]);

  useEffect(() => {
    async function run() {
      if (!uid) return;
      const snap = await getDoc(doc(db, "users", uid));
      setRole((snap.data() as { role?: string } | undefined)?.role ?? null);
    }
    void run();
  }, [uid]);

  async function onImport() {
    setBusy(true);
    setError(null);
    setLog("Fetching FIFA matches...\n");
    try {
      const results = await fetchFifaMatches();
      setLog((s) => s + `Fetched ${results.length} matches\n`);

      const { teams, matches } = normalizeMatches(results);
      setLog((s) => s + `Teams: ${teams.size}\nMatches: ${matches.size}\n`);

      const batch = writeBatch(db);

      for (const [teamId, team] of teams) {
        batch.set(doc(collection(db, "teams"), teamId), team, { merge: true });
      }

      for (const [matchId, match] of matches) {
        batch.set(doc(collection(db, "matches"), matchId), match, { merge: true });
      }

      batch.set(
        doc(collection(db, "tournamentConfig"), "current"),
        {
          preTournamentLockAt: new Date("2026-06-11T14:59:00.000Z"),
          scoringVersion: 1,
        },
        { merge: true }
      );

      await batch.commit();
      setLog((s) => s + "Import complete\n");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <h1>Admin Import</h1>
      <p>Role: {role ?? "(unknown)"}</p>
      {!uid ? <p>ログインしてください</p> : null}
      {uid && !canImport ? (
        <p>
          ADMIN権限が必要です。Firestoreの `users/{uid}.role` を `ADMIN` にして
          ください。
        </p>
      ) : null}
      <button disabled={!uid || !canImport || busy} onClick={onImport}>
        FIFAデータをインポート
      </button>
      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}
      <pre style={{ whiteSpace: "pre-wrap" }}>{log}</pre>
    </div>
  );
}
