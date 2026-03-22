"use client";

import React from "react";

export default function RankingGauge(props: { points: number | null; rank: number | null; total: number | null }) {
  const p = typeof props.points === "number" ? props.points : null;
  const r = typeof props.rank === "number" ? props.rank : null;
  const maxPoints = 6540;
  const rawProgress = p != null ? p / maxPoints : 0;
  let progress = Math.max(0, Math.min(1, rawProgress));

  const filledColor = "#3b82f6";

  const round = (n: number) => Number(n.toFixed(6));

  const size = 250;
  const stroke = 12;
  const center = size / 2;
  const radius = center - stroke - 6;
  const segments = 96;
  const gapDeg = 2;
  const segDeg = 360 / segments - gapDeg;
  const filled = Math.max(0, Math.min(segments, Math.round(progress * segments)));

  const polar = (angleDeg: number) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: round(center + radius * Math.cos(a)),
      y: round(center + radius * Math.sin(a)),
    };
  };

  const arcPath = (startDeg: number, endDeg: number) => {
    const start = polar(startDeg);
    const end = polar(endDeg);
    const largeArcFlag = endDeg - startDeg <= 180 ? 0 : 1;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  return (
    <div style={{ width: "min(420px, 100%)", display: "grid", justifyItems: "center" }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block" }}>
          {Array.from({ length: segments }).map((_, i) => {
            const start = i * (segDeg + gapDeg);
            const end = start + segDeg;
            const isFilled = i < filled;
            return (
              <path
                key={i}
                d={arcPath(start, end)}
                stroke={isFilled ? filledColor : "rgba(0,0,0,0.10)"}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="butt"
              />
            );
          })}
        </svg>

        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "rgba(0,0,0,0.55)" }}>RANKING</div>
            <div style={{ fontWeight: 900, fontSize: 52, lineHeight: "52px", color: "#3b82f6" }}>
              {r != null ? r.toLocaleString("ja-JP") : "-"}
            </div>
            <div style={{ display: "grid", justifyItems: "center", gap: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 18, lineHeight: "18px", color: "#a855f7" }}>
                {p != null ? p.toLocaleString("ja-JP") : "-"}
              </div>
              <div style={{ fontWeight: 900, fontSize: 12, lineHeight: "14px", color: "rgba(0,0,0,0.55)" }}>Pts</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
