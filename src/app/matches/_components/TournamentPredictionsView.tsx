import Link from "next/link";

import { useMemo } from "react";

import Countdown from "@/app/matches/[id]/_components/Countdown";

type TeamOption = { id: string; name: string };

type GroupBlock = { groupNameJa: string; teams: TeamOption[] };

export default function TournamentPredictionsView(props: {
  uid: string | null;
  busy: boolean;
  saving: boolean;
  error: string | null;

  lockMs: number | null;
  isLocked: boolean;

  canEditInitial: boolean;

  isRePredictWindow: boolean;
  reLockMs: number | null;
  canEditRe: boolean;

  championTeamId: string;
  onChampionChange: (teamId: string) => void;

  championTeamId2: string;
  onChampionChange2: (teamId: string) => void;

  teamOptions: TeamOption[];

  best4Slots: string[];
  best4Count: number;
  onBest4SlotChange: (slotIndex: number, teamId: string) => void;

  best4Slots2: string[];
  best4Count2: number;
  onBest4SlotChange2: (slotIndex: number, teamId: string) => void;

  gsOptions: TeamOption[];
  groups: GroupBlock[];
  gsQualifiedTeamIds: string[];
  gsCount: number;
  gsMax: number;
  onToggleGsTeam: (teamId: string) => void;

  onLogin: () => void;

  showSavedToLabel?: boolean;
}) {
  const selectedBest4Others = (slotId: string) =>
    new Set(props.best4Slots.filter((x) => x && x !== slotId));

  const selectedBest4Others2 = (slotId: string) =>
    new Set(props.best4Slots2.filter((x) => x && x !== slotId));

  const selectedGsAll = useMemo(() => new Set(props.gsQualifiedTeamIds.filter(Boolean)), [props.gsQualifiedTeamIds]);

  const textPrimary = "rgba(0, 0, 0, 0.88)";
  const textMuted = "rgba(0, 0, 0, 0.55)";

  const accentBlue = "#1e4ed8";
  const accentRed = "#dc2626";
  const accentGreen = "#16a34a";

  const cardStyle: React.CSSProperties = {
    width: "100%",
    background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,250,252,0.98) 100%)",
    borderRadius: 18,
    padding: 16,
    display: "grid",
    gap: 10,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 18px 44px rgba(0,0,0,0.20)",
    backdropFilter: "blur(8px)",
  };

  const selectStyle: React.CSSProperties = {
    width: "100%",
    height: 44,
    padding: "0 12px",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.12)",
    background: "linear-gradient(180deg, #ffffff 0%, #f7f7f9 100%)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
    fontWeight: 900,
    letterSpacing: 0.2,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #040913 0%, #0b1f3a 45%, #2b1d5f 100%)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.14), transparent 46%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: 24,
          display: "grid",
          gap: 14,
          maxWidth: 520,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div />
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          {typeof props.lockMs === "number" ? <Countdown targetMs={props.lockMs} /> : null}
        </div>

        {props.isRePredictWindow && typeof props.reLockMs === "number" ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <Countdown targetMs={props.reLockMs} />
          </div>
        ) : null}

        {!props.canEditInitial && !props.isRePredictWindow ? (
          <div style={{ color: "rgba(255,255,255,0.88)", fontWeight: 900, fontSize: 12 }}>
            締切後のため編集できません
          </div>
        ) : null}

        {props.isRePredictWindow && !props.canEditRe ? (
          <div style={{ color: "rgba(255,255,255,0.88)", fontWeight: 900, fontSize: 12 }}>
            再予想の締切を過ぎたため編集できません
          </div>
        ) : null}

        {props.busy ? <div style={{ color: "rgba(255,255,255,0.88)", fontWeight: 800 }}>読込中...</div> : null}
        {props.error ? <pre style={{ color: "#ffb4b4", whiteSpace: "pre-wrap" }}>{props.error}</pre> : null}

        {!props.uid ? (
          <div
            style={{
              ...cardStyle,
            }}
          >
            <div style={{ fontWeight: 900, color: textPrimary }}>ログインが必要です</div>
            <button
              onClick={props.onLogin}
              style={{
                height: 44,
                borderRadius: 999,
                border: "1px solid rgba(0,0,0,0.14)",
                background: "linear-gradient(180deg, #ffffff 0%, #f5f5f5 100%)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Googleログイン
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div
              style={{
                ...cardStyle,
                borderTop: `3px solid ${accentBlue}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: textPrimary }}>優勝予想</div>
                <div style={{ color: textMuted, fontWeight: 900, fontSize: 12 }}>500P</div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ color: textMuted, fontWeight: 900, fontSize: 12 }}>1次予想</span>
                  <select
                    value={props.championTeamId}
                    onChange={(e) => props.onChampionChange(e.target.value)}
                    disabled={!props.canEditInitial}
                    style={{
                      ...selectStyle,
                      color: textPrimary,
                      opacity: props.canEditInitial ? 1 : 0.65,
                      cursor: props.canEditInitial ? "pointer" : "not-allowed",
                    }}
                  >
                    <option value="">未設定</option>
                    {props.teamOptions.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>

                <details open={props.canEditRe} style={{ display: "grid", gap: 10 }}>
                  <summary
                    style={{
                      cursor: "pointer",
                      color: textMuted,
                      fontWeight: 900,
                      fontSize: 12,
                      listStyle: "none",
                    }}
                  >
                    2次予想（GS終了後〜KO開始まで / 200P）
                  </summary>
                  <label style={{ display: "grid", gap: 6 }}>
                    <span style={{ color: textMuted, fontWeight: 900, fontSize: 12 }}>2次予想</span>
                    <select
                      value={props.championTeamId2}
                      onChange={(e) => props.onChampionChange2(e.target.value)}
                      disabled={!props.canEditRe}
                      style={{
                        ...selectStyle,
                        color: textPrimary,
                        opacity: props.canEditRe ? 1 : 0.65,
                        cursor: props.canEditRe ? "pointer" : "not-allowed",
                        background: !props.canEditRe ? "rgba(0,0,0,0.04)" : (selectStyle.background as string),
                      }}
                    >
                      <option value="">未設定</option>
                      {props.teamOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </details>
              </div>
            </div>

            <div
              style={{
                ...cardStyle,
                borderTop: `3px solid ${accentRed}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 900, fontSize: 16, color: textPrimary }}>ベスト4</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div style={{ color: textMuted, fontWeight: 900, fontSize: 12 }}>50P（200P）</div>
                  <div style={{ color: textMuted, fontWeight: 900, fontSize: 12 }}>
                    {props.best4Count}/4
                    <span style={{ marginLeft: 8 }}>{props.best4Count2}/4</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {props.best4Slots.map((slotId, idx) => {
                  const selectedOthers = selectedBest4Others(slotId);
                  return (
                    <label key={idx} style={{ display: "grid", gap: 6 }}>
                      <span style={{ color: textMuted, fontWeight: 900, fontSize: 12 }}>{idx + 1}枠目{idx === 0 ? "（優勝と連動）" : ""}</span>
                      <select
                        value={slotId}
                        onChange={(e) => props.onBest4SlotChange(idx, e.target.value)}
                        disabled={!props.canEditInitial || idx === 0}
                        style={{
                          ...selectStyle,
                          background:
                            !props.canEditInitial || idx === 0
                              ? "rgba(0,0,0,0.04)"
                              : (selectStyle.background as string),
                          color: props.isLocked || idx === 0 ? "rgba(0,0,0,0.65)" : textPrimary,
                          cursor: !props.canEditInitial || idx === 0 ? "not-allowed" : "pointer",
                          opacity: props.canEditInitial ? 1 : 0.65,
                        }}
                      >
                        <option value="">未設定</option>
                        {props.teamOptions.map((t) => (
                          <option key={t.id} value={t.id} disabled={selectedOthers.has(t.id)}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  );
                })}
              </div>

              <div style={{ height: 1, background: "rgba(0,0,0,0.08)", margin: "2px 0" }} />

              <details open={props.canEditRe} style={{ display: "grid", gap: 10 }}>
                <summary
                  style={{
                    cursor: "pointer",
                    color: textMuted,
                    fontWeight: 900,
                    fontSize: 12,
                    listStyle: "none",
                  }}
                >
                  2次予想（GS終了後〜KO開始まで / 20P×4（80P））
                </summary>
                <div style={{ display: "grid", gap: 10 }}>
                  {props.best4Slots2.map((slotId, idx) => {
                    const selectedOthers = selectedBest4Others2(slotId);
                    return (
                      <label key={idx} style={{ display: "grid", gap: 6 }}>
                        <span style={{ color: textMuted, fontWeight: 900, fontSize: 12 }}>
                          {idx + 1}枠目（2次予想）{idx === 0 ? "（優勝と連動）" : ""}
                        </span>
                        <select
                          value={slotId}
                          onChange={(e) => props.onBest4SlotChange2(idx, e.target.value)}
                          disabled={!props.canEditRe || idx === 0}
                          style={{
                            ...selectStyle,
                            background:
                              !props.canEditRe || idx === 0
                                ? "rgba(0,0,0,0.04)"
                                : (selectStyle.background as string),
                            color: idx === 0 ? "rgba(0,0,0,0.65)" : textPrimary,
                            cursor: !props.canEditRe || idx === 0 ? "not-allowed" : "pointer",
                            opacity: props.canEditRe ? 1 : 0.65,
                          }}
                        >
                          <option value="">未設定</option>
                          {props.teamOptions.map((t) => (
                            <option key={t.id} value={t.id} disabled={selectedOthers.has(t.id)}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    );
                  })}
                </div>
              </details>
            </div>

            <div
              style={{
                ...cardStyle,
                borderTop: `3px solid ${accentGreen}`,
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  alignItems: "start",
                  gap: 10,
                }}
              >
                <div style={{ display: "grid", gap: 2, minWidth: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 15, lineHeight: 1.15, wordBreak: "break-word" }}>
                    ストレートイン（{props.gsMax}チーム）
                  </div>
                  <div style={{ color: textMuted, fontWeight: 900, fontSize: 11 }}>
                    20P（{props.gsMax * 20}P）
                  </div>
                </div>
                <div style={{ color: textMuted, fontWeight: 900, fontSize: 12, whiteSpace: "nowrap" }}>
                  {props.gsCount}/{props.gsMax}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  overflowX: "auto",
                  paddingBottom: 6,
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {props.groups.map((g) => {
                  const selectedInGroupCount = g.teams.filter((t) => selectedGsAll.has(t.id)).length;
                  const groupFull = selectedInGroupCount >= 2;
                  return (
                    <div
                      key={g.groupNameJa}
                      style={{
                        minWidth: 210,
                        borderRadius: 16,
                        border: "1px solid rgba(0,0,0,0.10)",
                        background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,250,250,0.98) 100%)",
                        padding: 10,
                        display: "grid",
                        gap: 8,
                        flex: "0 0 auto",
                        boxShadow: "0 10px 28px rgba(0,0,0,0.10)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900, fontSize: 13, color: "rgba(0, 0, 0, 0.72)" }}>{g.groupNameJa}</div>
                        <div style={{ color: textMuted, fontWeight: 900, fontSize: 12 }}>{selectedInGroupCount}/2</div>
                      </div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {g.teams.map((t) => {
                          const selected = selectedGsAll.has(t.id);
                          const disabled = !props.canEditInitial || (!selected && groupFull);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => props.onToggleGsTeam(t.id)}
                              disabled={disabled}
                              style={{
                                borderRadius: 12,
                                padding: "9px 10px",
                                border: selected ? `1px solid rgba(22, 163, 74, 0.55)` : "1px solid rgba(0,0,0,0.10)",
                                background: selected
                                  ? "linear-gradient(180deg, rgba(22,163,74,0.18) 0%, rgba(22,163,74,0.08) 100%)"
                                  : "rgba(0,0,0,0.02)",
                                fontWeight: 900,
                                fontSize: 12,
                                color: textPrimary,
                                display: "flex",
                                justifyContent: "space-between",
                                gap: 10,
                                width: "100%",
                                textAlign: "left",
                                cursor: disabled ? "not-allowed" : "pointer",
                                opacity: disabled ? 0.55 : 1,
                                boxShadow: selected ? "0 10px 18px rgba(22,163,74,0.14)" : "none",
                              }}
                            >
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                              {selected ? (
                                <span style={{ color: textMuted, fontWeight: 900, fontSize: 11 }}>選択中</span>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              </div>
            </div>

            <Link
              href="/results"
              style={{
                padding: 13,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.38)",
                fontWeight: 900,
                background: "linear-gradient(180deg, rgba(9, 30, 15, 0.92) 0%, rgba(5, 18, 9, 0.92) 100%)",
                boxShadow: "0 18px 34px rgba(0,0,0,0.26)",
                color: "#ff8a00",
                textAlign: "center",
                textDecoration: "none",
              }}
            >
              各試合への予想へ
            </Link>

            {props.showSavedToLabel ? (
              <div style={{ color: "rgba(255,255,255,0.70)", fontWeight: 900, fontSize: 12 }}>
                保存先: users/{props.uid}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
