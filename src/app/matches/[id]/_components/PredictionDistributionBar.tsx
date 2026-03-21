"use client";

export type PredictionDistribution = {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  total: number;
};

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export default function PredictionDistributionBar({
  title,
  homePct,
  drawPct,
  awayPct,
}: {
  title: string;
  homePct: number;
  drawPct: number;
  awayPct: number;
}) {
  const h = clampPct(homePct);
  const d = clampPct(drawPct);
  const a = clampPct(awayPct);

  const sum = h + d + a;
  const normH = sum === 0 ? 0 : (h / sum) * 100;
  const normD = sum === 0 ? 0 : (d / sum) * 100;
  const normA = sum === 0 ? 0 : (a / sum) * 100;
  const empty = sum === 0;

  return (
    <div style={{ display: "grid", gap: 6, width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center" }}>
        <div style={{ textAlign: "left", fontWeight: 900, color: "#f4c542" }}>{h}%</div>
        <div style={{ textAlign: "center", fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{title}</div>
        <div style={{ textAlign: "right", fontWeight: 900, color: "#d93025" }}>{a}%</div>
      </div>

      <div
        style={{
          height: 18,
          borderRadius: 999,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.22)",
          background: "rgba(0,0,0,0.18)",
          display: "grid",
          gridTemplateColumns: empty ? "1fr 1fr 1fr" : `${normH}% ${normD}% ${normA}%`,
        }}
      >
        <div style={{ background: "#f4c542", opacity: empty ? 0.25 : 1 }} />
        <div style={{ background: "#9aa0a6", opacity: empty ? 0.25 : 1 }} />
        <div style={{ background: "#d93025", opacity: empty ? 0.25 : 1 }} />
      </div>

      <div style={{ textAlign: "center", fontSize: 12, fontWeight: 900, color: "rgba(255,255,255,0.82)" }}>
        {h}-{d}-{a}（%）
      </div>
    </div>
  );
}
