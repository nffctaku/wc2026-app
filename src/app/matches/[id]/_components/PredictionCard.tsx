"use client";

export default function PredictionCard({
  lockedLabel,
  uid,
  predError,
  predSaved,
  predBusy,
  canEditPrediction,
  homeName,
  awayName,
  homeScore,
  awayScore,
  onHomeScoreChange,
  onAwayScoreChange,
  onSavePrediction,
}: {
  lockedLabel: string;
  uid: string | null;
  predError: string | null;
  predSaved: string | null;
  predBusy: boolean;
  canEditPrediction: boolean;
  homeName: string;
  awayName: string;
  homeScore: string;
  awayScore: string;
  onHomeScoreChange: (value: string) => void;
  onAwayScoreChange: (value: string) => void;
  onSavePrediction: () => void;
}) {
  return (
    <section style={{ padding: 4 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div style={{ fontWeight: 900 }}>スコア予想</div>
        <div style={{ fontSize: 12, color: "rgba(0,0,0,0.60)", fontWeight: 700 }}>{lockedLabel}</div>
      </div>

      {!uid ? <div style={{ marginTop: 8, fontSize: 13 }}>予想の入力にはログインが必要です</div> : null}
      {predError ? <pre style={{ color: "#b00020", margin: "8px 0 0" }}>{predError}</pre> : null}
      {predSaved ? <pre style={{ color: "#1b5e20", margin: "8px 0 0" }}>{predSaved}</pre> : null}
      {predBusy ? <div style={{ marginTop: 8, fontSize: 13 }}>予想を読込/保存中...</div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr auto 1fr auto", gap: 8, alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {homeName}
          </div>
          <input
            inputMode="numeric"
            value={homeScore}
            onChange={(e) => onHomeScoreChange(e.target.value)}
            disabled={!canEditPrediction || predBusy}
            style={{ padding: 10, width: "100%", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)" }}
          />
        </label>

        <div style={{ paddingBottom: 10, fontWeight: 900 }}>:</div>

        <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {awayName}
          </div>
          <input
            inputMode="numeric"
            value={awayScore}
            onChange={(e) => onAwayScoreChange(e.target.value)}
            disabled={!canEditPrediction || predBusy}
            style={{ padding: 10, width: "100%", borderRadius: 10, border: "1px solid rgba(0,0,0,0.18)" }}
          />
        </label>

        <button
          onClick={onSavePrediction}
          disabled={!canEditPrediction || predBusy}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "0",
            background: canEditPrediction && !predBusy ? "#f39c33" : "#c9c9c9",
            color: "#fff",
            fontWeight: 900,
            cursor: canEditPrediction && !predBusy ? "pointer" : "not-allowed",
          }}
        >
          保存
        </button>
      </div>
    </section>
  );
}
