import Link from "next/link";

import Countdown from "@/app/matches/[id]/_components/Countdown";

type TeamOption = { id: string; name: string };

export default function TournamentPredictionsView(props: {
  uid: string | null;
  busy: boolean;
  saving: boolean;
  error: string | null;

  lockMs: number | null;
  isLocked: boolean;

  championTeamId: string;
  onChampionChange: (teamId: string) => void;

  teamOptions: TeamOption[];

  best4Slots: string[];
  best4Count: number;
  onBest4SlotChange: (slotIndex: number, teamId: string) => void;

  gsOptions: TeamOption[];
  gsSlots: string[];
  gsCount: number;
  gsMax: number;
  onGsSlotChange: (slotIndex: number, teamId: string) => void;

  onLogin: () => void;
  onSave: () => void;

  showSavedToLabel?: boolean;
}) {
  const selectedBest4Others = (slotId: string) =>
    new Set(props.best4Slots.filter((x) => x && x !== slotId));

  const selectedGsOthers = (slotId: string) => new Set(props.gsSlots.filter((x) => x && x !== slotId));

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

      <div style={{ position: "relative", zIndex: 1, padding: 24, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ margin: 0, color: "rgba(255,255,255,0.92)" }}>大会予想</h1>
          <Link href="/me" style={{ color: "rgba(255,255,255,0.92)", textDecoration: "none", fontWeight: 900 }}>
            マイページ
          </Link>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          {typeof props.lockMs === "number" ? <Countdown targetMs={props.lockMs} /> : null}
        </div>

        {props.isLocked ? (
          <div style={{ color: "rgba(255,255,255,0.88)", fontWeight: 900, fontSize: 12 }}>
            締切後のため編集できません
          </div>
        ) : null}

        {props.busy ? <div style={{ color: "rgba(255,255,255,0.88)", fontWeight: 800 }}>読込中...</div> : null}
        {props.error ? <pre style={{ color: "#ffb4b4", whiteSpace: "pre-wrap" }}>{props.error}</pre> : null}

        {!props.uid ? (
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
              onClick={props.onLogin}
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
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>優勝予想</div>
                <div style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>500P</div>
              </div>
              <select
                value={props.championTeamId}
                onChange={(e) => props.onChampionChange(e.target.value)}
                disabled={props.isLocked}
                style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)" }}
              >
                <option value="">未設定</option>
                {props.teamOptions.map((t) => (
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
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>50P（200P）</div>
                  <div style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>{props.best4Count}/4</div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {props.best4Slots.map((slotId, idx) => {
                  const selectedOthers = selectedBest4Others(slotId);
                  return (
                    <label key={idx} style={{ display: "grid", gap: 4 }}>
                      <span style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>{idx + 1}枠目{idx === 0 ? "（優勝と連動）" : ""}</span>
                      <select
                        value={slotId}
                        onChange={(e) => props.onBest4SlotChange(idx, e.target.value)}
                        disabled={props.isLocked || idx === 0}
                        style={{
                          padding: 10,
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,0.15)",
                          background: props.isLocked || idx === 0 ? "rgba(0,0,0,0.04)" : "white",
                          color: props.isLocked || idx === 0 ? "rgba(0,0,0,0.65)" : "inherit",
                          cursor: props.isLocked || idx === 0 ? "not-allowed" : "pointer",
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
                <div style={{ fontWeight: 900, fontSize: 16 }}>ストレートイン（{props.gsMax}チーム）</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <div style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>20P（320P）</div>
                  <div style={{ color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: 12 }}>{props.gsCount}/{props.gsMax}</div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {[0, 1].map((slotIndex) => {
                  const slotId = props.gsSlots[slotIndex] ?? "";
                  const selectedOthers = selectedGsOthers(slotId);
                  return (
                    <div key={slotIndex} style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontWeight: 900, fontSize: 12, color: "rgba(0,0,0,0.7)" }}>
                        ストレートイン {slotIndex + 1}
                      </div>
                      <select
                        value={slotId}
                        onChange={(e) => props.onGsSlotChange(slotIndex, e.target.value)}
                        disabled={props.isLocked}
                        style={{
                          width: "100%",
                          height: 44,
                          borderRadius: 14,
                          padding: "0 12px",
                          border: "1px solid rgba(0,0,0,0.12)",
                          fontWeight: 900,
                          background: "white",
                        }}
                      >
                        <option value="">未選択</option>
                        {props.gsOptions.map((t) => (
                          <option key={t.id} value={t.id} disabled={selectedOthers.has(t.id)}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={props.onSave}
              disabled={props.saving || props.isLocked}
              style={{
                padding: 12,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.35)",
                fontWeight: 900,
                background: "rgba(9, 30, 15, 0.92)",
                color: "rgba(255,255,255,0.92)",
              }}
            >
              {props.isLocked ? "締切済み" : props.saving ? "保存中..." : "保存"}
            </button>

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
