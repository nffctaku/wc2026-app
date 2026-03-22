"use client";

import React from "react";

export default function StatGauge(props: {
  value: string;
  label: string;
  progress: number;
  unit?: string;
  accentColor?: string;
}) {
  let progress = Math.max(0, Math.min(1, props.progress));
  progress = Math.max(0.08, Math.min(0.98, progress));

  const accent = props.accentColor ?? "#3b82f6";

  const round = (n: number) => Number(n.toFixed(6));

  const size = 112;
  const stroke = 10;
  const center = size / 2;
  const radius = center - stroke - 4;
  const segments = 36;
  const gapDeg = 3;
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
    <div style={{ display: "grid", justifyItems: "center", gap: 10, minWidth: 0 }}>
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
                stroke={isFilled ? accent : "rgba(0,0,0,0.10)"}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="butt"
              />
            );
          })}
        </svg>

        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <div style={{ display: "grid", gap: 4, placeItems: "center" }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: "rgba(0,0,0,0.45)", letterSpacing: 0.2 }}>{props.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <div style={{ fontWeight: 900, fontSize: 30, lineHeight: "30px", color: accent }}>{props.value}</div>
              {props.unit ? <div style={{ fontWeight: 900, fontSize: 12, color: "rgba(0,0,0,0.55)" }}>{props.unit}</div> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
