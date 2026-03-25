"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions, usingFunctionsEmulator } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";

type BackfillPublicUsersResult = {
  updated: number;
};

export default function AdminPublicUsersPage() {
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
    if (!uid || !canRun || busy) return;

    setBusy(true);
    setError(null);
    setLog("Running backfillPublicUsers...\n");

    try {
      const fn = httpsCallable<undefined, BackfillPublicUsersResult>(functions, "backfillPublicUsers");
      const res = await fn(undefined);
      setLog((s) => s + `Done\nupdated: ${res.data.updated}\n`);
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
        <Link href="/admin/top">← Admin</Link>
        <h1 style={{ margin: 0 }}>Admin Public Users</h1>
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

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button disabled={!uid || !canRun || busy} onClick={onRun}>
          publicUsers を backfill
        </button>
      </div>

      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}
      <pre style={{ whiteSpace: "pre-wrap" }}>{log}</pre>
    </div>
  );
}
