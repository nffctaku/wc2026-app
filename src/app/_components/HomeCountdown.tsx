"use client";

import { useEffect, useMemo, useState } from "react";

type Countdown = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function calcCountdown(targetMs: number, nowMs: number): Countdown {
  const diff = targetMs - nowMs;
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, done: false };
}

export default function HomeCountdown(props: { kickoffIso: string }) {
  const kickoff = useMemo(() => new Date(props.kickoffIso), [props.kickoffIso]);

  const [countdown, setCountdown] = useState<Countdown | null>(null);

  useEffect(() => {
    setCountdown(calcCountdown(kickoff.getTime(), Date.now()));
    const id = window.setInterval(() => {
      setCountdown(calcCountdown(kickoff.getTime(), Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [kickoff]);

  if (!countdown) {
    const PlaceholderUnit = (p: { label: string }) => {
      const size = 72;
      const stroke = 6;
      const r = (size - stroke) / 2;
      return (
        <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
          <div style={{ position: "relative", width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }} aria-hidden="true">
              <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(16, 185, 129, 0.20)" strokeWidth={stroke} fill="none" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 22, lineHeight: "22px", color: "rgba(16, 185, 129, 0.95)", fontVariantNumeric: "tabular-nums" }}>
                --
              </div>
            </div>
          </div>
          <div style={{ fontWeight: 900, fontSize: 11, color: "rgba(16, 185, 129, 0.80)", letterSpacing: 0.2 }}>{p.label}</div>
        </div>
      );
    };

    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.72)" }}>OPENING MATCH</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <PlaceholderUnit label="Days" />
          <PlaceholderUnit label="Hours" />
          <PlaceholderUnit label="Minutes" />
          <PlaceholderUnit label="Seconds" />
        </div>
      </div>
    );
  }

  if (countdown.done) {
    return <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>開幕！</p>;
  }

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  const CircleUnit = (p: { value: string; label: string; progress: number }) => {
    const size = 72;
    const stroke = 6;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = c * clamp01(p.progress);
    const gap = c - dash;
    const accent = "#10b981";

    return (
      <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
        <div style={{ position: "relative", width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }} aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(16, 185, 129, 0.20)" strokeWidth={stroke} fill="none" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke={accent}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${gap}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>

          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 22, lineHeight: "22px", color: accent, fontVariantNumeric: "tabular-nums" }}>
              {p.value}
            </div>
          </div>
        </div>

        <div style={{ fontWeight: 900, fontSize: 11, color: "rgba(16, 185, 129, 0.80)", letterSpacing: 0.2 }}>{p.label}</div>
      </div>
    );
  };

  const daysText = countdown.days < 100 ? pad2(countdown.days) : String(countdown.days);
  const hoursText = pad2(countdown.hours);
  const minutesText = pad2(countdown.minutes);
  const secondsText = pad2(countdown.seconds);

  const daysProgress = clamp01(countdown.days / 30);
  const hoursProgress = clamp01(countdown.hours / 24);
  const minutesProgress = clamp01(countdown.minutes / 60);
  const secondsProgress = clamp01(countdown.seconds / 60);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.72)" }}>OPENING MATCH</div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <CircleUnit value={daysText} label="Days" progress={daysProgress} />
        <CircleUnit value={hoursText} label="Hours" progress={hoursProgress} />
        <CircleUnit value={minutesText} label="Minutes" progress={minutesProgress} />
        <CircleUnit value={secondsText} label="Seconds" progress={secondsProgress} />
      </div>
    </div>
  );
}
