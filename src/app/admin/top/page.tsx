"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { db, functions } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";

type AdminLink = {
  href: string;
  title: string;
  description?: string;
};

export default function AdminTopPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [unlockPassword, setUnlockPassword] = useState<string>("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const canEdit = useMemo(() => role === "ADMIN", [role]);

  useEffect(() => {
    return subscribeAuth((u) => {
      setUid(u?.uid ?? null);
      setRole(null);
      setError(null);
      setUnlockPassword("");
      setUnlockBusy(false);
      setUnlockError(null);
    });
  }, []);

  useEffect(() => {
    async function run() {
      if (!uid) return;
      try {
        const snap = await getDoc(doc(db, "users", uid));
        setRole((snap.data() as { role?: string } | undefined)?.role ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    void run();
  }, [uid]);

  async function onUnlock() {
    if (!uid || unlockBusy) return;
    setUnlockBusy(true);
    setUnlockError(null);
    try {
      const fn = httpsCallable<{ password: string }, { ok: boolean }>(functions, "unlockAdmin");
      const res = await fn({ password: unlockPassword });
      if (!res.data?.ok) throw new Error("unlock failed");
      const snap = await getDoc(doc(db, "users", uid));
      setRole((snap.data() as { role?: string } | undefined)?.role ?? null);
      setUnlockPassword("");
    } catch (e) {
      const anyErr = e as any;
      setUnlockError(anyErr?.message ? String(anyErr.message) : e instanceof Error ? e.message : String(e));
    } finally {
      setUnlockBusy(false);
    }
  }

  const links: AdminLink[] = [
    { href: "/admin/playoff-results", title: "プレーオフ結果入力", description: "プレーオフのスコア入力・リセット" },
    { href: "/admin/results", title: "試合結果入力", description: "本戦のスコア入力・更新" },
    { href: "/admin/recalc", title: "再集計", description: "ポイント再計算など" },
    { href: "/admin/public-users", title: "公開ユーザー", description: "publicUsers の管理" },
    { href: "/admin/import", title: "インポート", description: "データ取り込み" },
    { href: "/admin/backfill", title: "バックフィル", description: "データ補完" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "16px 16px 40px",
        background: "linear-gradient(135deg, #040913 0%, #0b1f3a 45%, #2b1d5f 100%)",
        color: "#fff",
        display: "grid",
        justifyItems: "center",
        alignContent: "start",
        gap: 14,
      }}
    >
      <div style={{ width: "min(520px, 100%)", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Link href="/" style={{ color: "rgba(255,255,255,0.92)", textDecoration: "none", fontWeight: 900 }}>
            ← Home
          </Link>
          <div style={{ fontWeight: 900 }}>Admin</div>
          <div style={{ width: 60 }} />
        </div>

        {error ? <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "#fff" }}>{error}</pre> : null}

        {!uid ? (
          <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>ログインしてください</div>
        ) : !canEdit ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>権限がありません</div>
            <div style={{ display: "grid", gap: 8 }}>
              <input
                type="password"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="管理パスワード"
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.96)",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => void onUnlock()}
                disabled={unlockBusy || !unlockPassword.trim()}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.10)",
                  color: "rgba(255,255,255,0.96)",
                  fontWeight: 900,
                  cursor: unlockBusy ? "not-allowed" : "pointer",
                }}
              >
                {unlockBusy ? "解除中..." : "解除"}
              </button>
              {unlockError ? <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "rgba(255,255,255,0.92)" }}>{unlockError}</pre> : null}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  textDecoration: "none",
                  color: "rgba(255,255,255,0.96)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  borderRadius: 14,
                  padding: "12px 14px",
                  display: "grid",
                  gap: 4,
                }}
              >
                <div style={{ fontWeight: 900 }}>{l.title}</div>
                {l.description ? <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(255,255,255,0.72)" }}>{l.description}</div> : null}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
