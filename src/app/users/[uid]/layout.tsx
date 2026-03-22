import type { Metadata } from "next";

import { collection, doc, getDoc, getDocs, orderBy, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase/server";

export async function generateMetadata({ params }: { params: Promise<{ uid: string }> }): Promise<Metadata> {
  const { uid } = await params;

  let nickname: string | null = null;
  let rank: number | null = null;
  let points: number | null = null;

  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    const data = userSnap.exists() ? (userSnap.data() as { nickname?: string | null }) : null;
    nickname = typeof data?.nickname === "string" && data.nickname.trim() ? data.nickname.trim() : null;
  } catch {
    nickname = null;
  }

  try {
    const statsSnap = await getDocs(query(collection(db, "userStats"), where("uid", "==", uid)));
    const statsDoc = statsSnap.docs[0]?.data() as { totalPoints?: number } | undefined;
    points = typeof statsDoc?.totalPoints === "number" ? statsDoc.totalPoints : null;
  } catch {
    points = null;
  }

  try {
    const allStatsSnap = await getDocs(query(collection(db, "userStats"), orderBy("totalPoints", "desc")));
    let found: number | null = null;
    for (let i = 0; i < allStatsSnap.docs.length; i++) {
      const d = allStatsSnap.docs[i]!;
      const data = d.data() as { uid?: string };
      if (data.uid === uid) {
        found = i + 1;
        break;
      }
    }
    rank = found;
  } catch {
    rank = null;
  }

  const titleParts = [nickname ?? "WC2026", "Profile"].filter(Boolean);
  const title = titleParts.join(" | ");

  const descParts: string[] = [];
  if (rank != null) descParts.push(`RANK ${rank.toLocaleString("ja-JP")}`);
  if (points != null) descParts.push(`${points.toLocaleString("ja-JP")} Pts`);
  const description = descParts.length > 0 ? descParts.join(" / ") : `WC2026 ユーザーページ (${uid})`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
