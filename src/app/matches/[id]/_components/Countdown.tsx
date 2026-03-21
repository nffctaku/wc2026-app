"use client";

import { useEffect, useMemo, useState } from "react";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}日 ${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

export default function Countdown({
  targetMs,
}: {
  targetMs: number;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remainingMs = useMemo(() => {
    const now = Date.now();
    return Math.max(0, targetMs - now);
  }, [targetMs, tick]);

  const closed = remainingMs <= 0;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: closed ? "rgba(217,48,37,0.20)" : "rgba(255,255,255,0.12)",
        border: closed ? "1px solid rgba(217,48,37,0.35)" : "1px solid rgba(255,255,255,0.18)",
        color: "rgba(255,255,255,0.95)",
        fontWeight: 900,
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ opacity: 0.9 }}>締切まで</span>
      <span>{closed ? "締切済み" : formatRemaining(remainingMs)}</span>
    </div>
  );
}
