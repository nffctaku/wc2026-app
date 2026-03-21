"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions, usingFunctionsEmulator } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";

type BackfillResult = {
  matchId: string | null;
  matchesUpdated: number;
  predictionsProcessed: number;
};

export default function AdminBackfillPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");
  const [matchIdsText, setMatchIdsText] = useState<string>("400021470\n400021443\n400021441");

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

  const canRun = useMemo(() => role === "ADMIN", [role]);

  const matchIds = useMemo(() => {
    return matchIdsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [matchIdsText]);

  async function onRunSelected() {
    if (!uid || !canRun || busy) return;
    if (matchIds.length === 0) {
      setError("matchId を1行に1つ入力してください");
      return;
    }

    setBusy(true);
    setError(null);
    setLog(`Running backfillMatchPredictionStats for ${matchIds.length} matches...\n`);

    try {
      const fn = httpsCallable<{ matchId: string }, BackfillResult>(functions, "backfillMatchPredictionStats");
      for (const mid of matchIds) {
        setLog((s) => s + `- ${mid} ...\n`);
        const res = await fn({ matchId: mid });
        setLog(
          (s) =>
            s +
            `  done: matchesUpdated=${res.data.matchesUpdated}, predictionsProcessed=${res.data.predictionsProcessed}\n`
        );
      }
      setLog((s) => s + "Done\n");
    } catch (e) {
      const anyErr = e as any;
      const parts = [
        anyErr?.code ? String(anyErr.code) : null,
        anyErr?.message ? String(anyErr.message) : null,
        anyErr?.details ? JSON.stringify(anyErr.details, null, 2) : null,
      ].filter(Boolean);
      setError(parts.length ? parts.join("\n") : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onRunAll() {
    if (!uid || !canRun || busy) return;
    setBusy(true);
    setError(null);
    setLog("Running backfillMatchPredictionStats for ALL matches...\n");

    try {
      const fn = httpsCallable<undefined, BackfillResult>(functions, "backfillMatchPredictionStats");
      const res = await fn(undefined);
      setLog(
        (s) =>
          s +
          `Done\nmatchesUpdated: ${res.data.matchesUpdated}\npredictionsProcessed: ${res.data.predictionsProcessed}\n`
      );
    } catch (e) {
      const anyErr = e as any;
      const parts = [
        anyErr?.code ? String(anyErr.code) : null,
        anyErr?.message ? String(anyErr.message) : null,
        anyErr?.details ? JSON.stringify(anyErr.details, null, 2) : null,
      ].filter(Boolean);
      setError(parts.length ? parts.join("\n") : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Link href="/">← Home</Link>
        <h1 style={{ margin: 0 }}>Admin Backfill</h1>
      </div>

      <p>Role: {role ?? "(unknown)"}</p>
      <p>Functions Emulator: {usingFunctionsEmulator ? "ON" : "OFF"}</p>
      {!uid ? <p>ログインしてください</p> : null}
      {uid && !canRun ? (
        <p>
          ADMIN権限が必要です。Firestoreの `users/{"{uid}"}.role` を `ADMIN` にして
          ください。
        </p>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        <label style={{ fontWeight: 800 }}>matchId（1行に1つ）</label>
        <textarea
          value={matchIdsText}
          onChange={(e) => setMatchIdsText(e.target.value)}
          rows={6}
          style={{ width: "100%", maxWidth: 520, padding: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        />
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button disabled={!uid || !canRun || busy} onClick={onRunSelected}>
          指定試合のみ backfill
        </button>
        <button disabled={!uid || !canRun || busy} onClick={onRunAll}>
          全試合 backfill
        </button>
      </div>

      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}
      <pre style={{ whiteSpace: "pre-wrap" }}>{log}</pre>
    </div>
  );
}
