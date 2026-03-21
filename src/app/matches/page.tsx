"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import { signInWithGoogle, subscribeAuth } from "@/lib/firebase/auth";
import type { UserDoc } from "@/lib/firebase/user";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

export default function MatchesPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Map<string, TeamDoc>>(new Map());
  const [teamGroupById, setTeamGroupById] = useState<Map<string, string>>(new Map());
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);

  const [championTeamId, setChampionTeamId] = useState<string>("");
  const [best4TeamIds, setBest4TeamIds] = useState<string[]>([]);
  const [gsQualifiedTeamIds, setGsQualifiedTeamIds] = useState<string[]>([]);

  useEffect(() => {
    return subscribeAuth((u) => {
      setUid(u?.uid ?? null);
      setError(null);
    });
  }, []);

  useEffect(() => {
    async function run() {
      setBusy(true);
      setError(null);
      try {
        const teamSnap = await getDocs(collection(db, "teams"));
        const teamMap = new Map<string, TeamDoc>();
        for (const docSnap of teamSnap.docs) {
          teamMap.set(docSnap.id, docSnap.data() as TeamDoc);
        }
        setTeams(teamMap);

        const matchSnap = await getDocs(
          query(collection(db, "matches"), orderBy("kickoffAt", "asc"))
        );
        const matchRows: { id: string }[] & MatchDoc[] = matchSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as MatchDoc),
        })) as unknown as ({ id: string }[] & MatchDoc[]);

        const groupStageMatches = (matchRows as unknown as Array<MatchDoc & { id: string }>).filter(
          (m) => {
            const stage = typeof m.stageNameJa === "string" ? m.stageNameJa : "";
            const group = typeof m.groupNameJa === "string" ? m.groupNameJa : "";
            return stage.includes("グループ") || group.includes("グループ");
          }
        );

        const groupByTeamId = new Map<string, string>();
        for (const m of groupStageMatches) {
          const groupName = m.groupNameJa && m.groupNameJa.trim() ? m.groupNameJa.trim() : "グループ未定";
          if (m.homeTeamId && !groupByTeamId.has(m.homeTeamId)) groupByTeamId.set(m.homeTeamId, groupName);
          if (m.awayTeamId && !groupByTeamId.has(m.awayTeamId)) groupByTeamId.set(m.awayTeamId, groupName);
        }
        setTeamGroupById(groupByTeamId);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, []);

  useEffect(() => {
    if (!uid) {
      setUserDoc(null);
      setChampionTeamId("");
      setBest4TeamIds([]);
      setGsQualifiedTeamIds([]);
      return;
    }

    const ref = doc(db, "users", uid);
    return onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setUserDoc(null);
          setChampionTeamId("");
          setBest4TeamIds([]);
          setGsQualifiedTeamIds([]);
          return;
        }
        const data = snap.data() as UserDoc;
        setUserDoc(data);
        setChampionTeamId(data.championTeamId ?? "");
        setBest4TeamIds(Array.isArray(data.best4TeamIds) ? data.best4TeamIds.filter(Boolean) : []);
        setGsQualifiedTeamIds(
          Array.isArray(data.gsQualifiedTeamIds) ? data.gsQualifiedTeamIds.filter(Boolean) : []
        );
      },
      (e) => setError(e instanceof Error ? e.message : String(e))
    );
  }, [uid]);

  const teamOptions = useMemo(() => {
    return Array.from(teams.entries())
      .map(([id, t]) => ({ id, name: t.nameJa ?? id }))
      .sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [teams]);

  const best4Slots = useMemo(() => {
    const normalized = best4TeamIds.filter(Boolean);
    const slots = ["", "", "", ""];
    for (let i = 0; i < Math.min(4, normalized.length); i++) {
      slots[i] = normalized[i] ?? "";
    }
    return slots;
  }, [best4TeamIds]);

  const groups = useMemo(() => {
    const map = new Map<string, { id: string; name: string }[]>();
    for (const t of teamOptions) {
      const g = teamGroupById.get(t.id) ?? "グループ未定";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(t);
    }
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      map.set(k, list);
    }

    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b, "ja"));
    return keys.map((k) => ({ groupNameJa: k, teams: map.get(k)! }));
  }, [teamOptions, teamGroupById]);

  function toggleMulti(
    current: string[],
    nextId: string,
    max: number
  ): { next: string[]; ok: boolean } {
    if (!nextId) return { next: current, ok: false };
    if (current.includes(nextId)) {
      return { next: current.filter((x) => x !== nextId), ok: true };
    }
    if (current.length >= max) {
      return { next: current, ok: false };
    }
    return { next: [...current, nextId], ok: true };
  }

  async function onSave() {
    if (!uid) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<UserDoc> = {
        championTeamId: championTeamId.trim() ? championTeamId.trim() : null,
        best4TeamIds: best4TeamIds.filter(Boolean).length ? best4TeamIds.filter(Boolean) : null,
        gsQualifiedTeamIds: gsQualifiedTeamIds.length ? gsQualifiedTeamIds : null,
      };
      await setDoc(doc(db, "users", uid), payload, { merge: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ margin: 0 }}>大会予想</h1>
        <Link href="/me">マイページ</Link>
      </div>

      {busy ? <div>読込中...</div> : null}
      {error ? <pre style={{ color: "#b00020", whiteSpace: "pre-wrap" }}>{error}</pre> : null}

      {!uid ? (
        <div
          style={{
            width: "100%",
            background: "rgba(255,255,255,0.98)",
            borderRadius: 18,
            padding: 16,
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 900 }}>ログインが必要です</div>
          <button
            onClick={() => void signInWithGoogle()}
            style={{ padding: 10, borderRadius: 999, border: "1px solid #ccc" }}
          >
            Googleログイン
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <div
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.98)",
              borderRadius: 18,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 16 }}>優勝予想</div>
            <select
              value={championTeamId}
              onChange={(e) => setChampionTeamId(e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}
            >
              <option value="">未設定</option>
              {teamOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.98)",
              borderRadius: 18,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>ベスト4</div>
              <div style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>
                {best4TeamIds.filter(Boolean).length}/4
              </div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {best4Slots.map((slotId, idx) => {
                const selectedOthers = new Set(best4Slots.filter((x) => x && x !== slotId));
                return (
                  <label key={idx} style={{ display: "grid", gap: 4 }}>
                    <span style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>
                      {idx + 1}枠目
                    </span>
                    <select
                      value={slotId}
                      onChange={(e) => {
                        const next = [...best4Slots];
                        next[idx] = e.target.value;
                        setBest4TeamIds(next.filter(Boolean));
                      }}
                      style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}
                    >
                      <option value="">未設定</option>
                      {teamOptions.map((t) => (
                        <option key={t.id} value={t.id} disabled={selectedOthers.has(t.id)}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          </div>

          <div
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.98)",
              borderRadius: 18,
              padding: 16,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>GS突破（32チーム）</div>
              <div style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>
                {gsQualifiedTeamIds.length}/32
              </div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {groups
                .filter((g) => g.groupNameJa !== "グループ未定")
                .map((g) => (
                  <div
                    key={g.groupNameJa}
                    style={{
                      border: "1px solid rgba(0,0,0,0.10)",
                      borderRadius: 14,
                      padding: 10,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: 13, color: "rgba(0,0,0,0.75)" }}>
                      {g.groupNameJa}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                      {g.teams.map((t) => {
                        const checked = gsQualifiedTeamIds.includes(t.id);
                        const disabled = !checked && gsQualifiedTeamIds.length >= 32;
                        return (
                          <label
                            key={t.id}
                            style={{
                              display: "flex",
                              gap: 10,
                              alignItems: "center",
                              padding: 10,
                              borderRadius: 12,
                              border: "1px solid rgba(0,0,0,0.12)",
                              opacity: disabled ? 0.5 : 1,
                              cursor: disabled ? "not-allowed" : "pointer",
                              userSelect: "none",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => {
                                const { next, ok } = toggleMulti(gsQualifiedTeamIds, t.id, 32);
                                if (ok) setGsQualifiedTeamIds(next);
                              }}
                            />
                            <span style={{ fontWeight: 900, fontSize: 12, lineHeight: "16px" }}>{t.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}

              {groups.some((g) => g.groupNameJa === "グループ未定") ? (
                <div style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>
                  グループ未定のチームがあります（データ反映待ち）
                </div>
              ) : null}
            </div>
          </div>

          <button
            onClick={() => void onSave()}
            disabled={saving}
            style={{ padding: 12, borderRadius: 999, border: "1px solid rgba(0,0,0,0.15)", fontWeight: 900 }}
          >
            {saving ? "保存中..." : "保存"}
          </button>

          {userDoc ? (
            <div style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>
              保存先: users/{uid}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
