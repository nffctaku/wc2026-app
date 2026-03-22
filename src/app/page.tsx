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
        background: "linear-gradient(135deg, #040913 0%, #0b1f3a 45%, #2b1d5f 100%)",
        backgroundImage: "url('/52.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        position: "relative",
        ["--background" as any]: "transparent",
        ["--foreground" as any]: "transparent",
        ["--text-primary" as any]: "rgba(255,255,255,0.96)",
        ["--text-secondary" as any]: "rgba(255,255,255,0.72)",
        ["--button-secondary-border" as any]: "rgba(255,255,255,0.18)",
        ["--button-secondary-hover" as any]: "rgba(255,255,255,0.10)",
        ["--button-primary-hover" as any]: "rgba(255,255,255,0.86)",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.38)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.14), transparent 46%)",
          pointerEvents: "none",
        }}
      />
      <main className={styles.main} style={{ position: "relative", backgroundColor: "transparent", paddingTop: 36, paddingBottom: 36 }}>
        <div style={{ width: "100%", display: "grid", gap: 18 }}>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.2, color: "rgba(255,255,255,0.96)" }}>
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
