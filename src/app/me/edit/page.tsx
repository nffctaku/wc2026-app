"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";

import styles from "../../page.module.css";

import { auth, db, storage } from "@/lib/firebase/client";
import { signInWithGoogle, signOut, subscribeAuth } from "@/lib/firebase/auth";
import { updateUserProfile, type UserDoc } from "@/lib/firebase/user";
import type { TeamDoc } from "@/lib/fifa/normalize";

export default function MeEditPage() {
  const [user, setUser] = useState(() => auth.currentUser);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);

  const [nicknameInput, setNicknameInput] = useState("");
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [xUrlInput, setXUrlInput] = useState("");
  const [instagramUrlInput, setInstagramUrlInput] = useState("");
  const [championTeamId, setChampionTeamId] = useState<string>("");

  const [teams, setTeams] = useState<Map<string, TeamDoc>>(new Map());
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

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
      setPhotoUrlInput("");
      setXUrlInput("");
      setInstagramUrlInput("");
      setChampionTeamId("");
      return;
    }

    return onSnapshot(userDocRef, (snap) => {
      if (!snap.exists()) {
        setUserDoc(null);
        setNicknameInput("");
        setPhotoUrlInput("");
        setXUrlInput("");
        setInstagramUrlInput("");
        setChampionTeamId("");
        return;
      }
      const data = snap.data() as UserDoc;
      setUserDoc(data);
      setNicknameInput(data.nickname);
      setPhotoUrlInput(data.photoURL ?? "");
      setXUrlInput(data.xUrl ?? "");
      setInstagramUrlInput(data.instagramUrl ?? "");
      setChampionTeamId(data.championTeamId ?? "");
    });
  }, [userDocRef]);

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

  function normalizeUrl(raw: string): string | null {
    const v = raw.trim();
    if (!v) return null;
    return v;
  }

  async function onUploadPhoto(file?: File) {
    if (!uid) return;
    const f = file ?? photoFile;
    if (!f) return;

    setUploadingPhoto(true);
    setError(null);
    try {
      if (!f.type.startsWith("image/")) {
        throw new Error("画像ファイルを選択してください");
      }
      if (f.size > 5 * 1024 * 1024) {
        throw new Error("画像サイズは5MB以下にしてください");
      }

      const ext = f.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `userAvatars/${uid}/${Date.now()}.${ext}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, f, { contentType: f.type });
      const url = await getDownloadURL(r);
      setPhotoUrlInput(url);
      setPhotoFile(null);
      setPhotoPreviewUrl(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function onSaveProfile() {
    if (!uid) return;
    setSaving(true);
    setError(null);
    try {
      await updateUserProfile(db, uid, {
        nickname: nicknameInput.trim(),
        photoURL: normalizeUrl(photoUrlInput),
        xUrl: normalizeUrl(xUrlInput),
        instagramUrl: normalizeUrl(instagramUrlInput),
        championTeamId: championTeamId.trim() ? championTeamId.trim() : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const idLabel = userDoc?.idNo != null ? String(userDoc.idNo).padStart(5, "0") : "-";

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div style={{ width: "100%", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/me">← マイページ</Link>
            {uid ? <Link href={`/users/${uid}`}>公開プロフィール</Link> : <div />}
          </div>

          {user ? (
            <div style={{ width: "100%", background: "rgba(255,255,255,0.95)", borderRadius: 18, padding: 16, display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>プロフィール編集</div>

              <div style={{ display: "flex", justifyContent: "center", paddingBottom: 6 }}>
                <input
                  id="me-edit-photo-file"
                  type="file"
                  accept="image/*"
                  disabled={!uid || uploadingPhoto}
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.currentTarget.files?.[0] ?? null;
                    setPhotoFile(f);
                    if (!f) {
                      setPhotoPreviewUrl(null);
                      return;
                    }
                    const u = URL.createObjectURL(f);
                    setPhotoPreviewUrl(u);
                    void onUploadPhoto(f);
                  }}
                />

                <label
                  htmlFor="me-edit-photo-file"
                  style={{
                    width: 96,
                    height: 96,
                    borderRadius: 999,
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.10)",
                    display: "grid",
                    placeItems: "center",
                    position: "relative",
                    cursor: !uid || uploadingPhoto ? "not-allowed" : "pointer",
                    opacity: !uid || uploadingPhoto ? 0.6 : 1,
                  }}
                >
                  {photoPreviewUrl ? (
                    <img src={photoPreviewUrl} alt="" width={96} height={96} style={{ width: 96, height: 96, objectFit: "cover" }} />
                  ) : photoUrlInput.trim() ? (
                    <img
                      src={photoUrlInput.trim()}
                      alt=""
                      width={96}
                      height={96}
                      style={{ width: 96, height: 96, objectFit: "cover" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", background: "#7a8a93" }} />
                  )}

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "end center",
                      paddingBottom: 8,
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(0,0,0,0.55)",
                        color: "rgba(255,255,255,0.95)",
                        fontWeight: 900,
                        fontSize: 12,
                        padding: "4px 10px",
                        borderRadius: 999,
                      }}
                    >
                      変更
                    </div>
                  </div>
                </label>
              </div>

              <div style={{ display: "flex", gap: 12, color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 14 }}>
                <div>ID</div>
                <div>{idLabel}</div>
              </div>

              <label style={{ display: "grid", gap: 4 }}>
                <span>ニックネーム</span>
                <input value={nicknameInput} onChange={(e) => setNicknameInput(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }} />
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>X URL</span>
                <input value={xUrlInput} onChange={(e) => setXUrlInput(e.target.value)} placeholder="https://x.com/..." style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }} />
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>Instagram URL</span>
                <input
                  value={instagramUrlInput}
                  onChange={(e) => setInstagramUrlInput(e.target.value)}
                  placeholder="https://www.instagram.com/..."
                  style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}
                />
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span>優勝チーム予想</span>
                <select value={championTeamId} onChange={(e) => setChampionTeamId(e.target.value)} style={{ padding: 8, border: "1px solid #ccc", borderRadius: 6 }}>
                  <option value="">未設定</option>
                  {Array.from(teams.entries())
                    .sort((a, b) => (a[1].nameJa ?? a[0]).localeCompare(b[1].nameJa ?? b[0], "ja"))
                    .map(([id, t]) => (
                      <option key={id} value={id}>
                        {t.nameJa ?? id}
                      </option>
                    ))}
                </select>
              </label>

              <button onClick={onSaveProfile} disabled={saving || uploadingPhoto} style={{ padding: 10, borderRadius: 999, border: "1px solid #ccc" }}>
                保存
              </button>

              {error ? <p style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>{error}</p> : null}
            </div>
          ) : (
            <div style={{ width: "100%", background: "rgba(255,255,255,0.95)", borderRadius: 18, padding: 16, display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>プロフィール編集</div>
              <div>Googleログインしてください</div>
              {error ? <p style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>{error}</p> : null}
            </div>
          )}

          <div className={styles.ctas}>
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
        </div>
      </main>
    </div>
  );
}
