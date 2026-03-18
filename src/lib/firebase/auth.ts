import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth, db } from "./client";
import { ensureUserDoc } from "./user";

const provider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<void> {
  const result = await signInWithPopup(auth, provider);
  await ensureUserDoc(db, result.user);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}
