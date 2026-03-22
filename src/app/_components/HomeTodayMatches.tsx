"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase/client";
import type { MatchDoc, TeamDoc } from "@/lib/fifa/normalize";

type MatchRow = MatchDoc & { id: string };

type TeamLite = {
  nameJa: string;
  code?: string;
  flagUrl?: string;
};

function formatKickoff(ts: Timestamp): string {
  const d = ts.toDate();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function teamName(t: TeamLite | null, fallbackId: string): string {
  return t?.nameJa ?? fallbackId;
}

function flagSrc(t: TeamLite | null): string | null {
  if (!t) return null;
  const code = typeof t.code === "string" ? t.code.trim().toUpperCase() : "";
  if (!code) return null;
  return `/国旗/${code}.png`;
}

export default function HomeTodayMatches(props: { max?: number }) {
  const max = typeof props.max === "number" ? props.max : 6;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [teams, setTeams] = useState<Map<string, TeamLite>>(new Map());

  const [title, setTitle] = useState<string>("試合");

  function formatDateLabel(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1);
    const day = String(d.getDate());
    return `${y}/${m}/${day}`;
  }

  useEffect(() => {
    async function run() {
      setBusy(true);
      setError(null);
      try {
        const firstSnap = await getDocs(query(collection(db, "matches"), orderBy("kickoffAt", "asc"), limit(1)));
        const first = firstSnap.docs[0]?.data() as MatchDoc | undefined;
        const firstKickoff = first?.kickoffAt;
        if (!firstKickoff) {
          setRows([]);
          setTeams(new Map());
          return;
        }

        const d = firstKickoff.toDate();
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

        setTitle(formatDateLabel(start));

        const daySnap = await getDocs(
          query(
            collection(db, "matches"),
            where("kickoffAt", ">=", Timestamp.fromDate(start)),
            where("kickoffAt", "<", Timestamp.fromDate(end)),
            orderBy("kickoffAt", "asc"),
            limit(max)
          )
        );

        const ms: MatchRow[] = daySnap.docs.map((d) => ({ id: d.id, ...(d.data() as MatchDoc) }));
        setRows(ms);

        const ids = new Set<string>();
        for (const m of ms) {
          if (typeof m.homeTeamId === "string") ids.add(m.homeTeamId);
          if (typeof m.awayTeamId === "string") ids.add(m.awayTeamId);
        }

        const idList = Array.from(ids);
        const teamSnaps = await Promise.all(idList.map((id) => getDoc(doc(db, "teams", id))));
        const map = new Map<string, TeamLite>();
        for (let i = 0; i < teamSnaps.length; i++) {
          const id = idList[i]!;
          const s = teamSnaps[i]!;
          if (!s.exists()) continue;
          const t = s.data() as TeamDoc;
          if (typeof t.nameJa !== "string") continue;
          map.set(id, {
            nameJa: t.nameJa,
            code: typeof t.code === "string" ? t.code.trim().toUpperCase() : undefined,
            flagUrl: typeof t.flagUrl === "string" ? t.flagUrl : undefined,
          });
        }
        setTeams(map);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setRows([]);
        setTeams(new Map());
      } finally {
        setBusy(false);
      }
    }

    void run();
  }, [max]);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.96)" }}>{title}</div>
        <Link href="/matches" style={{ fontWeight: 900, fontSize: 12, color: "rgba(255,255,255,0.80)", textDecoration: "none" }}>
          もっと見る
        </Link>
      </div>

      {busy ? <div style={{ fontWeight: 800, color: "rgba(0,0,0,0.55)" }}>読込中...</div> : null}
      {error ? <div style={{ fontWeight: 800, color: "#b00020", whiteSpace: "pre-wrap" }}>{error}</div> : null}

      {!busy && !error && rows.length === 0 ? (
        <div style={{ fontWeight: 800, color: "rgba(0,0,0,0.55)" }}>試合がありません</div>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((m) => {
          const home = teams.get(m.homeTeamId) ?? null;
          const away = teams.get(m.awayTeamId) ?? null;
          const homeFlag = flagSrc(home);
          const awayFlag = flagSrc(away);
          const hasScore = m.status === "FINISHED" && typeof m.homeScore === "number" && typeof m.awayScore === "number";

          return (
            <Link
              key={m.id}
              href={`/matches/${m.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "52px 1fr 64px",
                gap: 10,
                alignItems: "center",
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.68)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 12, color: "rgba(0,0,0,0.60)" }}>{formatKickoff(m.kickoffAt)}</div>

              <div style={{ minWidth: 0, display: "grid" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, padding: "2px 0" }}>
                  {homeFlag ? (
                    <img
                      src={homeFlag}
                      alt=""
                      width={18}
                      height={12}
                      style={{ width: 18, height: 12, objectFit: "cover", borderRadius: 2, flex: "0 0 auto" }}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {teamName(home, m.homeTeamId)}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    minWidth: 0,
                    padding: "2px 0",
                    borderTop: "1px solid rgba(0,0,0,0.08)",
                    marginTop: 4,
                    paddingTop: 6,
                  }}
                >
                  {awayFlag ? (
                    <img
                      src={awayFlag}
                      alt=""
                      width={18}
                      height={12}
                      style={{ width: 18, height: 12, objectFit: "cover", borderRadius: 2, flex: "0 0 auto" }}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {teamName(away, m.awayTeamId)}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", alignSelf: "center" }}>
                {hasScore ? (
                  <div style={{ fontWeight: 900 }}>{m.homeScore}-{m.awayScore}</div>
                ) : (
                  <div style={{ fontWeight: 900, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>予想</div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
