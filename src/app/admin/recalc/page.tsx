"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions, usingFunctionsEmulator } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";

type RecalcResult = {
  matchesProcessed: number;
  predictionsProcessed: number;
  pointsWritten: number;
  usersUpdated: number;
  scoringVersion: number;
};

export default function AdminRecalcPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");

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

  async function onRun() {
    if (!uid || !canRun) return;
    setBusy(true);
    setError(null);
    setLog("Running recalcPoints...\n");

    try {
      const fn = httpsCallable<undefined, RecalcResult>(functions, "recalcPoints");
      const res = await fn(undefined);
      setLog(
        (s) =>
          s +
          `Done\n` +
          `matchesProcessed: ${res.data.matchesProcessed}\n` +
          `predictionsProcessed: ${res.data.predictionsProcessed}\n` +
          `pointsWritten: ${res.data.pointsWritten}\n` +
          `usersUpdated: ${res.data.usersUpdated}\n` +
          `scoringVersion: ${res.data.scoringVersion}\n`
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
        <h1 style={{ margin: 0 }}>Admin Recalc</h1>
      </div>

      <p>Role: {role ?? "(unknown)"}</p>
      <p>Functions Emulator: {usingFunctionsEmulator ? "ON" : "OFF"}</p>
      {!uid ? <p>ログインしてください</p> : null}
      {uid && !canRun ? (
        <p>
          ADMIN権限が必要です。Firestoreの `users/{uid}.role` を `ADMIN` にして
          ください。
        </p>
      ) : null}

      <button disabled={!uid || !canRun || busy} onClick={onRun}>
        採点・再集計を実行
      </button>

      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}
      <pre style={{ whiteSpace: "pre-wrap" }}>{log}</pre>

      <p style={{ color: "#666" }}>
        ※ Functionsを未デプロイの場合、先に Functions Emulator を起動するか、Functions を deploy してください。
      </p>
    </div>
  );
}
