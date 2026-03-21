import type { User } from "firebase/auth";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";

export type UserRole = "USER" | "ADMIN";

export type UserDoc = {
  idNo: number;
  nickname: string;
  photoURL: string | null;
  xUrl: string | null;
  instagramUrl: string | null;
  championTeamId: string | null;
  role: UserRole;
  createdAt: unknown;
  updatedAt: unknown;
};

export async function ensureUserDoc(db: Firestore, user: User): Promise<void> {
  const userRef = doc(db, "users", user.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) return;

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (userSnap.exists()) return;

    const counterRef = doc(db, "counters", "userNo");
    const counterSnap = await tx.get(counterRef);
    const current = counterSnap.exists()
      ? (counterSnap.data().current as number | undefined) ?? 0
      : 0;
    const next = current + 1;

    tx.set(counterRef, { current: next }, { merge: true });

    const nickname = user.displayName?.trim() || "";

    const payload: UserDoc = {
      idNo: next,
      nickname,
      photoURL: user.photoURL ?? null,
      xUrl: null,
      instagramUrl: null,
      championTeamId: null,
      role: "USER",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    tx.set(userRef, payload);
  });
}

export async function updateNickname(
  db: Firestore,
  uid: string,
  nickname: string
): Promise<void> {
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      nickname,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function updateUserProfile(
  db: Firestore,
  uid: string,
  input: {
    nickname?: string;
    photoURL?: string | null;
    xUrl?: string | null;
    instagramUrl?: string | null;
    championTeamId?: string | null;
  }
): Promise<void> {
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      ...input,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
