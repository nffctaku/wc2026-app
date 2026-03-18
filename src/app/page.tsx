"use client";

import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
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
