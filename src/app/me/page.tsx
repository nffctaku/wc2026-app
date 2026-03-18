"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "../page.module.css";

import { onSnapshot, doc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";

import { auth, db } from "@/lib/firebase/client";
import { signInWithGoogle, signOut, subscribeAuth } from "@/lib/firebase/auth";
import { updateNickname, type UserDoc } from "@/lib/firebase/user";

export default function MePage() {
  const [user, setUser] = useState(() => auth.currentUser);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = user?.uid ?? null;
  const userDocRef = useMemo(() => {
    if (!uid) return null;
    return doc(db, "users", uid);
  }, [uid]);

  useEffect(() => {
    return subscribeAuth((u) => {
      setUser(u);
      setError(null);
    });
  }, []);

  useEffect(() => {
    if (!userDocRef) {
      setUserDoc(null);
      setNicknameInput("");
      return;
    }

    return onSnapshot(userDocRef, (snap) => {
      if (!snap.exists()) {
        setUserDoc(null);
        setNicknameInput("");
        return;
      }
      const data = snap.data() as UserDoc;
      setUserDoc(data);
      setNicknameInput(data.nickname);
    });
  }, [userDocRef]);

  async function onClickLogin() {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onClickLogout() {
    setError(null);
    try {
      await signOut();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onSaveNickname() {
    if (!uid) return;
    setSaving(true);
    setError(null);
    try {
      await updateNickname(db, uid, nicknameInput.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Link href="/">← Home</Link>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        <div className={styles.intro}>
          <h1>マイページ</h1>
          {user ? (
            <p>
              Login: {user.email ?? user.uid}
              <br />
              IDno: {userDoc?.idNo ?? "-"}
            </p>
          ) : (
            <p>Googleログインしてください</p>
          )}

          {user ? (
            <div style={{ width: "100%", display: "grid", gap: 8 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span>ニックネーム</span>
                <input
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                />
              </label>
              <button
                onClick={onSaveNickname}
                disabled={saving}
                style={{ padding: 10, borderRadius: 999, border: "1px solid #ccc" }}
              >
                保存
              </button>
            </div>
          ) : null}

          {error ? (
            <p style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>{error}</p>
          ) : null}
        </div>

        <div className={styles.ctas}>
          <Link className={styles.secondary} href="/matches">
            予想（試合一覧）
          </Link>
          <Link className={styles.secondary} href="/results">
            大会結果
          </Link>
          <Link className={styles.secondary} href="/ranking">
            ランキング
          </Link>
          <Link className={styles.secondary} href="/admin/results">
            管理: 結果入力
          </Link>
          <Link className={styles.secondary} href="/admin/recalc">
            管理: 再集計
          </Link>
          {user ? (
            <button className={styles.secondary} onClick={onClickLogout}>
              ログアウト
            </button>
          ) : (
            <button className={styles.primary} onClick={onClickLogin}>
              Googleログイン
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
