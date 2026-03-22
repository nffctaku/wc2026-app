import Link from "next/link";

import styles from "../page.module.css";

export default function HomeCtas() {
  return (
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
  );
}
