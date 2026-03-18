"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

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

export default function Home() {
  const kickoff = useMemo(() => {
    return new Date("2026-06-11T19:00:00.000Z");
  }, []);

  const [mounted, setMounted] = useState(false);

  const [countdown, setCountdown] = useState<Countdown>(() => ({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    done: false,
  }));

  useEffect(() => {
    setMounted(true);
    const id = window.setInterval(() => {
      setCountdown(calcCountdown(kickoff.getTime(), Date.now()));
    }, 1000);
    return () => window.clearInterval(id);
  }, [kickoff]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />

        <div className={styles.intro}>
          <h1>WC2026</h1>
          <p>スコア予想・ランキングを楽しむアプリ（MVP）</p>
          <div style={{ display: "grid", gap: 6 }}>
            <p style={{ margin: 0, color: "#666" }}>
              開幕戦: 2026年6月12日（金） 午前4:00（日本時間）
            </p>
            {!mounted ? (
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>あと --日 --:--:--</p>
            ) : countdown.done ? (
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>開幕！</p>
            ) : (
              <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                あと {countdown.days}日 {pad2(countdown.hours)}:{pad2(countdown.minutes)}:{pad2(
                  countdown.seconds
                )}
              </p>
            )}
          </div>
        </div>

        <div className={styles.ctas}>
          <Link className={styles.primary} href="/me">
            マイページ
          </Link>
          <Link className={styles.secondary} href="/matches">
            予想（試合一覧）
          </Link>
          <Link className={styles.secondary} href="/results">
            大会結果
          </Link>
          <Link className={styles.secondary} href="/ranking">
            ランキング
          </Link>
          <Link className={styles.secondary} href="/admin/results">
            管理: 結果入力
          </Link>
          <Link className={styles.secondary} href="/admin/recalc">
            管理: 再集計
          </Link>
        </div>
      </main>
    </div>
  );
}
