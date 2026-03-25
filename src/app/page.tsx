"use client";

import styles from "./page.module.css";

import HomeCountdown from "@/app/_components/HomeCountdown";
import HomeTodayMatches from "@/app/_components/HomeTodayMatches";
import HomeTopRanking from "@/app/_components/HomeTopRanking";

export default function Home() {
  const kickoffIso = "2026-06-11T19:00:00.000Z";

  return (
    <div
      className={styles.page}
      style={{
        minHeight: "100vh",
        backgroundColor: "#fff8e7",
        backgroundImage: "linear-gradient(180deg, #fffdf6 0%, #fff3da 100%)",
        position: "relative",
        ["--background" as any]: "transparent",
        ["--foreground" as any]: "transparent",
        ["--text-primary" as any]: "rgba(0,0,0,0.92)",
        ["--text-secondary" as any]: "rgba(0,0,0,0.62)",
        ["--button-secondary-border" as any]: "rgba(0,0,0,0.12)",
        ["--button-secondary-hover" as any]: "rgba(0,0,0,0.06)",
        ["--button-primary-hover" as any]: "rgba(0,0,0,0.84)",
      }}
    >
      <div className={`${styles.bgLayer} ${styles.bg1}`} />
      <div className={`${styles.bgLayer} ${styles.bg2}`} />
      <div className={`${styles.bgLayer} ${styles.bg3}`} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(255,255,255,0.0)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.55), transparent 56%)",
          pointerEvents: "none",
        }}
      />
      <main className={styles.main} style={{ position: "relative", backgroundColor: "transparent", paddingTop: 36, paddingBottom: 36 }}>
        <div style={{ width: "100%", display: "grid", gap: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.2, color: "rgba(0,0,0,0.92)" }}>
            FIFA World Cup 2026
          </div>
          <HomeCountdown kickoffIso={kickoffIso} />
          <HomeTodayMatches max={6} />
          <HomeTopRanking limit={10} />
        </div>
      </main>
    </div>
  );
}
