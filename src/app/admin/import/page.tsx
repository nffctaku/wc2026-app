"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { subscribeAuth } from "@/lib/firebase/auth";
import { fetchFifaMatches } from "@/lib/fifa/api";
import { normalizeMatches } from "@/lib/fifa/normalize";

import { playoffMatches } from "@/app/playoff/_lib/playoffMatches";

const fifaRankByNameJa: Record<string, number> = {
  "スペイン": 1,
  "アルゼンチン": 2,
  "フランス": 3,
  "イングランド": 4,
  "ブラジル": 5,
  "ポルトガル": 6,
  "オランダ": 7,
  "モロッコ": 8,
  "ベルギー": 9,
  "ドイツ": 10,
  "クロアチア": 11,
  "イタリア": 12,
  "コロンビア": 13,
  "セネガル": 14,
  "アメリカ合衆国": 15,
  "メキシコ": 16,
  "ウルグアイ": 17,
  "スイス": 18,
  "日本": 19,
  "イラン": 20,
  "デンマーク": 21,
  "大韓民国": 22,
  "韓国": 22,
  "エクアドル": 23,
  "オーストリア": 24,
  "トルコ": 25,
  "ナイジェリア": 26,
  "オーストラリア": 27,
  "アルジェリア": 28,
  "カナダ": 29,
  "ウクライナ": 30,
  "エジプト": 31,
  "ノルウェー": 32,
  "パナマ": 33,
  "ポーランド": 34,
  "ウェールズ": 35,
  "ロシア": 36,
  "コートジボワール": 37,
  "スコットランド": 38,
  "セルビア": 39,
  "パラグアイ": 40,
  "ハンガリー": 41,
  "スウェーデン": 42,
  "チェコ共和国": 43,
  "チェコ": 43,
  "スロバキア": 44,
  "カメルーン": 45,
  "ギリシャ": 46,
  "チュニジア": 47,
  "コンゴ民主共和国": 48,
  "ルーマニア": 49,
  "ベネズエラ": 50,
  "コスタリカ": 51,
  "ウズベキスタン": 52,
  "ペルー": 53,

  "南アフリカ": 60,
  "サウジアラビア": 61,
  "アルバニア": 63,
  "ヨルダン": 64,
  "北マケドニア": 66,
  "北マケドニア共和国": 66,
  "カーボベルデ": 67,
  "カーボベルデ共和国": 67,
  "北アイルランド": 69,
  "アイルランド": 59,
  "アイルランド共和国": 59,
  "ボスニアヘルツェゴビナ": 71,
  "ボスニア・ヘルツェゴビナ": 71,
  "ガーナ": 72,
  "コソボ": 79,
  "キュラソー": 81,
  "ハイチ": 83,
  "ニュージーランド": 85,
  "アンゴラ": 89,
};

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
        const rank = team.nameJa ? fifaRankByNameJa[team.nameJa.trim()] : undefined;
        batch.set(
          doc(collection(db, "teams"), teamId),
          {
            ...team,
            ...(typeof rank === "number" ? { fifaRank: rank } : null),
          },
          { merge: true }
        );
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

  async function onUpsertPlayoffTeams() {
    if (!uid || !canImport || busy) return;
    setBusy(true);
    setError(null);
    setLog("Upserting playoff teams...\n");
    try {
      const byCode = new Map<string, { code: string; nameJa: string }>();
      for (const m of playoffMatches) {
        const hCode = m.homeCode?.trim()?.toUpperCase();
        const aCode = m.awayCode?.trim()?.toUpperCase();
        if (hCode) byCode.set(hCode, { code: hCode, nameJa: m.home });
        if (aCode) byCode.set(aCode, { code: aCode, nameJa: m.away });
      }

      const batch = writeBatch(db);
      let upserted = 0;
      let ranked = 0;

      for (const t of byCode.values()) {
        const teamId = `PO_${t.code}`;
        const rank = fifaRankByNameJa[t.nameJa.trim()];
        if (typeof rank === "number") ranked += 1;
        upserted += 1;
        batch.set(
          doc(collection(db, "teams"), teamId),
          {
            code: t.code,
            nameJa: t.nameJa,
            ...(typeof rank === "number" ? { fifaRank: rank } : null),
          },
          { merge: true }
        );
      }

      await batch.commit();
      setLog((s) => s + `Done\nupserted: ${upserted}\nranked: ${ranked}\n`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onApplyFifaRanking() {
    if (!uid || !canImport || busy) return;
    setBusy(true);
    setError(null);
    setLog("Applying FIFA ranking to teams...\n");
    try {
      const snap = await getDocs(collection(db, "teams"));
      const batch = writeBatch(db);
      let updated = 0;
      let matched = 0;

      for (const d of snap.docs) {
        const data = d.data() as { nameJa?: string; fifaRank?: number };
        const name = (data.nameJa ?? "").trim();
        if (!name) continue;
        const rank = fifaRankByNameJa[name];
        if (typeof rank !== "number") continue;
        matched += 1;
        if (data.fifaRank === rank) continue;
        updated += 1;
        batch.set(doc(collection(db, "teams"), d.id), { fifaRank: rank }, { merge: true });
      }

      await batch.commit();
      setLog((s) => s + `Done\nmatched: ${matched}\nupdated: ${updated}\n`);
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
      <div style={{ display: "grid", gap: 10 }}>
        <button disabled={!uid || !canImport || busy} onClick={onImport}>
          FIFAデータをインポート
        </button>
        <button disabled={!uid || !canImport || busy} onClick={onApplyFifaRanking}>
          FIFAランキングを反映
        </button>
        <button disabled={!uid || !canImport || busy} onClick={onUpsertPlayoffTeams}>
          プレーオフ出場国を反映
        </button>
      </div>
      {error ? <pre style={{ color: "#b00020" }}>{error}</pre> : null}
      <pre style={{ whiteSpace: "pre-wrap" }}>{log}</pre>
    </div>
  );
}
