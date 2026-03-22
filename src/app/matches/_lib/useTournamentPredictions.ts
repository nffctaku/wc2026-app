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
import { computeStandings } from "@/app/results/_lib/standings";

type TeamOption = { id: string; name: string };

const GS_MAX = 2;

const GS_GROUP_RE = /^グループ\s*[Ａ-ＬA-L]/;

const GS_SPECIAL_MERGE_IDS = ["PH_CODE_ITA", "PH_CODE_NIR", "PH_CODE_WAL", "PH_CODE_BIH"] as const;
const GS_SPECIAL_MERGED_OPTION: TeamOption = { id: "PH_MERGED_ITA_NIR_WAL_BIH", name: "ITA/NIR/WAL/BIH" };

type GroupBlock = {
  groupNameJa: string;
  teams: TeamOption[];
};

export function useTournamentPredictions(): {
  uid: string | null;
  busy: boolean;
  saving: boolean;
  error: string | null;

  lockMs: number | null;
  isLocked: boolean;

  championTeamId: string;
  setChampionTeamId: (value: string) => void;

  teamOptions: TeamOption[];

  best4Slots: string[];
  best4Count: number;
  updateBest4Slot: (slotIndex: number, teamId: string) => void;

  gsOptions: TeamOption[];
  gsSlots: string[];
  updateGsSlot: (slotIndex: number, teamId: string) => void;

  groups: GroupBlock[];
  gsQualifiedTeamIds: string[];
  gsCount: number;
  gsMax: number;
  toggleGsQualified: (teamId: string) => void;

  onLogin: () => void;
  onSave: () => void;
  userDoc: UserDoc | null;
} {
  const [uid, setUid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [teams, setTeams] = useState<Map<string, TeamDoc>>(new Map());
  const [groupStageMatches, setGroupStageMatches] = useState<Array<MatchDoc & { id: string }>>([]);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);

  const [lockMs, setLockMs] = useState<number | null>(null);

  const [championTeamId, setChampionTeamId] = useState<string>("");
  const [best4TeamIds, setBest4TeamIds] = useState<string[]>([]);
  const [gsQualifiedTeamIds, setGsQualifiedTeamIds] = useState<string[]>([]);

  useEffect(() => {
    const c = championTeamId.trim();
    if (!c) return;
    setBest4TeamIds((prev) => {
      if (prev.includes(c)) return prev;
      return [c, ...prev].slice(0, 4);
    });
  }, [championTeamId]);

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

        const matchSnap = await getDocs(query(collection(db, "matches"), orderBy("kickoffAt", "asc")));
        const matchRows: { id: string }[] & MatchDoc[] = matchSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as MatchDoc),
        })) as unknown as ({ id: string }[] & MatchDoc[]);

        let earliestKickoff: number | null = null;
        for (const m of matchRows as unknown as Array<MatchDoc & { id: string }>) {
          const kickoffAny = (m as any).kickoffAt;
          const ms = kickoffAny && typeof kickoffAny.toMillis === "function" ? kickoffAny.toMillis() : null;
          if (typeof ms !== "number") continue;
          earliestKickoff = earliestKickoff === null ? ms : Math.min(earliestKickoff, ms);
        }
        setLockMs(earliestKickoff === null ? null : earliestKickoff - 24 * 60 * 60 * 1000);

        const groupStageMatches = (matchRows as unknown as Array<MatchDoc & { id: string }>).filter((m) => {
          const stage = typeof m.stageNameJa === "string" ? m.stageNameJa : "";
          const group = typeof m.groupNameJa === "string" ? m.groupNameJa : "";
          return stage.includes("グループ") || group.includes("グループ");
        });

        setGroupStageMatches(groupStageMatches);
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
        setGsQualifiedTeamIds(Array.isArray(data.gsQualifiedTeamIds) ? data.gsQualifiedTeamIds.filter(Boolean) : []);
      },
      (e) => setError(e instanceof Error ? e.message : String(e))
    );
  }, [uid]);

  const gsStandingsGroups = useMemo(() => {
    if (groupStageMatches.length === 0 || teams.size === 0) return [];
    return computeStandings(groupStageMatches as any, teams);
  }, [groupStageMatches, teams]);

  const best4Slots = useMemo(() => {
    const c = championTeamId.trim();
    const normalized = best4TeamIds.filter(Boolean).filter((x) => x !== c);
    const slots = ["", "", "", ""];
    if (c) slots[0] = c;
    for (let i = 0; i < Math.min(3, normalized.length); i++) {
      slots[i + 1] = normalized[i] ?? "";
    }
    return slots;
  }, [best4TeamIds, championTeamId]);

  const groups = useMemo(() => {
    const blocks: GroupBlock[] = [];
    for (const g of gsStandingsGroups) {
      const groupName = typeof g.groupNameJa === "string" && g.groupNameJa.trim() ? g.groupNameJa.trim() : "グループ未定";
      if (groupName === "グループ未定") continue;
      if (!GS_GROUP_RE.test(groupName)) continue;

      const options: TeamOption[] = g.teams
        .map((t) => {
          const doc = teams.get(t.teamId);
          const name = (typeof doc?.nameJa === "string" && doc.nameJa.trim()) ? doc.nameJa : t.teamLabel;
          return { id: t.teamId, name };
        })
        .sort((a, b) => a.name.localeCompare(b.name, "ja"));

      blocks.push({ groupNameJa: groupName, teams: options });
    }

    blocks.sort((a, b) => a.groupNameJa.localeCompare(b.groupNameJa, "ja"));
    return blocks;
  }, [gsStandingsGroups, teams]);

  const gsOptions = useMemo(() => {
    const base = groups
      .flatMap((g) => g.teams)
      .filter((t) => !GS_SPECIAL_MERGE_IDS.includes(t.id as (typeof GS_SPECIAL_MERGE_IDS)[number]));

    const byId = new Map<string, TeamOption>();
    for (const t of base) byId.set(t.id, t);
    byId.set(GS_SPECIAL_MERGED_OPTION.id, GS_SPECIAL_MERGED_OPTION);

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }, [groups]);

  const teamOptions = useMemo(() => {
    return gsOptions;
  }, [gsOptions]);

  const gsSlots = useMemo(() => {
    const normalized = gsQualifiedTeamIds.filter(Boolean);
    const slots = ["", ""];
    for (let i = 0; i < Math.min(GS_MAX, normalized.length); i++) {
      slots[i] = normalized[i] ?? "";
    }
    return slots;
  }, [gsQualifiedTeamIds]);

  function updateGsSlot(slotIndex: number, teamId: string) {
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= GS_MAX) return;
    const next = [...gsSlots];
    next[slotIndex] = teamId;
    const unique = Array.from(new Set(next.filter(Boolean)));
    setGsQualifiedTeamIds(unique.slice(0, GS_MAX));
  }

  function onLogin() {
    void signInWithGoogle();
  }

  function updateBest4Slot(slotIndex: number, teamId: string) {
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 3) return;
    if (slotIndex === 0) return;
    const next = [...best4Slots];
    next[slotIndex] = teamId;
    const c = championTeamId.trim();
    const unique = Array.from(new Set(next.filter(Boolean).filter((x) => x !== c)));
    const merged = c ? [c, ...unique] : unique;
    setBest4TeamIds(merged.slice(0, 4));
  }

  function toggleGsQualified(teamId: string) {
    if (!teamId) return;
    if (gsQualifiedTeamIds.includes(teamId)) {
      setGsQualifiedTeamIds(gsQualifiedTeamIds.filter((x) => x !== teamId));
      return;
    }
    if (gsQualifiedTeamIds.length >= GS_MAX) return;
    setGsQualifiedTeamIds([...gsQualifiedTeamIds, teamId]);
  }

  async function onSave() {
    if (!uid) return;
    if (lockMs !== null && Date.now() >= lockMs) return;
    setSaving(true);
    setError(null);
    try {
      const payload: Partial<UserDoc> = {
        championTeamId: championTeamId.trim() ? championTeamId.trim() : null,
        best4TeamIds: (() => {
          const c = championTeamId.trim();
          const unique = Array.from(new Set(best4Slots.filter(Boolean)));
          if (c && !unique.includes(c)) unique.unshift(c);
          const list = unique.slice(0, 4);
          return list.length ? list : null;
        })(),
        gsQualifiedTeamIds: gsQualifiedTeamIds.length ? gsQualifiedTeamIds : null,
      };
      await setDoc(doc(db, "users", uid), payload, { merge: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return {
    uid,
    busy,
    saving,
    error,

    lockMs,
    isLocked: lockMs !== null && Date.now() >= lockMs,
    championTeamId,
    setChampionTeamId,
    teamOptions,
    best4Slots,
    best4Count: best4TeamIds.filter(Boolean).length,
    updateBest4Slot,

    gsOptions,
    gsSlots,
    updateGsSlot,

    groups,
    gsQualifiedTeamIds,
    gsCount: gsQualifiedTeamIds.length,
    gsMax: GS_MAX,
    toggleGsQualified,
    onLogin,
    onSave,
    userDoc,
  };
}
