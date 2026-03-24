"use client";

import Link from "next/link";
import styles from "../page.module.css";

export default function SpecPage() {
  return (
    <div className={styles.page} style={{ minHeight: "100vh" }}>
      <main className={styles.main}>
        <div style={{ width: "100%", display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ fontWeight: 900, fontSize: 20 }}>仕様・設計まとめ</div>
            <Link href="/" style={{ fontWeight: 900 }}>
              ← Home
            </Link>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>目的</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.7" }}>
              FIFA World Cup 2026 を題材に、試合スコア予想・ランキング・大会予想を行うサイト。
              ユーザーは Google ログイン後に予想を保存でき、結果に応じてポイントが集計されます。
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>ページ構成（主要）</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>/</span>：背景スライド + OPENING MATCH カウントダウン + 1日目の試合 + TOP10ランキング
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>/matches</span>：予想する（試合ごとのスコア予想、大会予想のUIを配置）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>/matches/[id]</span>：試合詳細（スコア予想の入力・保存、予想分布の表示など）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>/results</span>：試合結果一覧（グループステージなど）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>/knockout</span>：決勝トーナメント
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>/ranking</span>：総合ランキング
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>/me</span>：マイページ（プロフィール/成績/共有）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>/users/[uid]</span>：公開プロフィール（他ユーザーの成績閲覧）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>/contact</span>：お問い合わせ
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>/spec</span>：このページ
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>UI/レイアウト方針</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>ヘッダー</span>：モバイルはハンバーガー + ドロワー、PCはヘッダー右にメニューを横並び表示
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>トップ背景</span>：`52.png / 56.png / 57.png` を CSS の opacity アニメーションでクロスフェード（JSタイマーなし）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>読みやすさ</span>：暗幕オーバーレイ + radial ハイライトを重ねて文字の視認性を確保
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>認証</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>ログイン</span>：Firebase Auth（Google）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>未ログイン</span>：閲覧可能なページは閲覧のみ、保存系（予想/プロフィール更新）は不可
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>技術スタック（エンジニア共有用）</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>フロントエンド</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>Framework</span>：Next.js（App Router）
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>Next.js</span>：16.1.7
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>React</span>：19.x
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>TypeScript</span>：5.x
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>Lint</span>：ESLint（eslint-config-next）
                </div>
              </div>

              <div>
                <span style={{ fontWeight: 900 }}>バックエンド / インフラ（Firebase）</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>DB</span>：Cloud Firestore
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>Auth</span>：Firebase Authentication（Google）
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>Functions</span>：Cloud Functions for Firebase
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>Storage</span>：Firebase Storage（プロジェクト初期化済み）
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>Firebase SDK</span>：`firebase` npm package
                </div>
              </div>

              <div>
                <span style={{ fontWeight: 900 }}>Functions 実行環境</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>Runtime</span>：Node.js 20（functions 側 engines）
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>言語</span>：TypeScript（`functions/src` → `functions/lib` に build）
                </div>
              </div>

              <div>
                <span style={{ fontWeight: 900 }}>ローカル開発</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>Dev Server</span>：`npm run dev`（Next.js）
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>Emulator</span>：Functions（5001）/ Firestore（8080）/ Emulator UI 有効
                </div>
              </div>

              <div>
                <span style={{ fontWeight: 900 }}>デプロイ（代表）</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>Firestore Rules</span>：`firebase deploy --only firestore:rules`
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>Functions</span>：`firebase deploy --only functions`
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>Firestore（概略）</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>users/{"{"}uid{"}"}</span>：本人用プロフィール（読み取りは本人/管理者）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>publicUsers/{"{"}uid{"}"}</span>：公開プロフィール（誰でも読める）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>predictions/{"{"}uid_matchId{"}"}</span>：試合スコア予想（ログインで読める、書き込みは本人のみ）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>matches</span>：試合マスター（読取公開、書込は管理者）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>teams</span>：チームマスター（読取公開、書込は管理者）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>userStats</span>：集計結果（読取公開）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>userMatchPoints</span>：試合ごとの獲得ポイント（読取公開）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>matchPredictionStats</span>：予想分布（読取公開）
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>ポイント集計（スコアリング）</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>集計のタイミング</span>：`matches/{"{"}matchId{"}"}` が更新され、試合が `FINISHED` になった（またはスコアが更新された）タイミングで Cloud Functions がポイントを更新
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>点数ルール</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>完全一致</span>（スコアが完全一致）：50pt
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>勝敗一致</span>（勝ち/負け/引き分けのみ一致）：20pt
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>不一致</span>：0pt
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>反映先</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>userMatchPoints/{"{"}uid_matchId{"}"}</span>：試合ごとの獲得ポイント（`points`）を保存
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>userStats/{"{"}uid{"}"}</span>：総合ポイント（`totalPoints`）を増分更新
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>scoringVersion</span>：`tournamentConfig/current` の `scoringVersion` を参照し、`userMatchPoints` / `userStats` に保存（ルール変更時の識別用）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>再集計</span>：管理者向け Callable Function により、確定済み試合（`FINISHED`）を対象に全ユーザーの `userMatchPoints` と `userStats.totalPoints` を再計算可能
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>運営（管理）ページ</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>前提</span>：Firestore の `users/{"{"}uid{"}"}.role` が `ADMIN` のユーザーのみ利用可能
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>結果入力（試合確定）</span>：`/admin/results`
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>用途</span>：試合の `homeScore / awayScore` を入力して `FINISHED` として確定
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>更新先</span>：`matches/{"{"}matchId{"}"}` に `homeScore`, `awayScore`, `status: "FINISHED"`, `resultUpdatedAt` を `merge: true` で保存
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>集計への影響</span>：この更新をトリガーに Cloud Functions（`onMatchWritten`）が走り、`userMatchPoints` と `userStats.totalPoints` が更新される
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>採点・再集計</span>：`/admin/recalc`
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>用途</span>：Callable Function `recalcPoints` を実行し、`FINISHED` 試合を対象に全ユーザーのポイントを再計算
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>利用シーン</span>：採点ロジック変更・過去試合のスコア修正・集計不整合のリカバリ
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>FIFAデータインポート</span>：`/admin/import`
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>用途</span>：FIFA API から `teams` / `matches` を取り込み、`tournamentConfig/current`（`preTournamentLockAt`, `scoringVersion`）も更新
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>マイページ（/me）設計</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>目的</span>：ユーザー本人の現在成績（ランキング/ポイント/精度）をひと目で把握でき、プロフィールの共有・編集導線を提供
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>背景</span>：トップ（/）と同様の背景（`52/56/57` クロスフェード + 暗幕 + radial ハイライト）を適用し、コンテンツはカードで視認性を確保
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>データ取得</span>：`useProfileStats(uid, {`subscribeUserDoc: true`})` を使用
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>プロフィール</span>：`users/{"{"}uid{"}"}` を購読（`nickname/photoURL/idNo` など）
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>ランキング/ポイント</span>：`userStats` から総合ポイント・順位を算出
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>母数（参加ユーザー数）</span>：`publicUsers` 件数を優先し、取得できない場合は `userStats` 件数にフォールバック
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>命中率系</span>：`predictions`（本人分）と `matches`（`FINISHED`）を突合して算出
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>共有</span>：`/users/{"{"}uid{"}"}` のURLを Web Share API で共有、非対応環境はクリップボードへコピー
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>グラフ設計（RankingGauge）</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>表示内容</span>：`RANK {"{"}rank{"}"} / {"{"}total{"}"}` と `Pts`（総合ポイント）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>リングの意味</span>：総合ポイント（`points`）を最大値（固定）で正規化した進捗として表示
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>maxPoints</span>：`6540`（現状は固定値）
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>progress</span>：`points / maxPoints` を `0..1` に clamp
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>表現</span>：円周を複数セグメントに分け、filled数で進捗を表現
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>備考</span>：リング進捗は「順位」ではなく「ポイント」の可視化（順位は数値で表示）
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>グラフ設計（StatGauge：完全的中率 / 勝敗的中率 / 予想試合数）</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>共通（見た目）</span>：円形セグメント（36分割）で進捗を表示、`accentColor` は値に応じて変化
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>共通（progress clamp）</span>：UIとして見切れないよう `0.08..0.98` に丸め（0%/100%でも最低限リングが見える設計）
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>完全的中率</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>対象</span>：本人の `predictions` のうち、対応する試合が `FINISHED` でスコアが確定しているもの
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>分母</span>：`eligibleFinishedCount`（確定試合のうち、予想が存在する試合数）
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>分子</span>：`perfectHitCount`（スコア完全一致の件数）
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>計算</span>：`perfectRate = perfectHitCount / eligibleFinishedCount * 100`
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>勝敗的中率</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>分子</span>：`outcomeHitCount`（勝ち/負け/引分の一致件数）
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>計算</span>：`outcomeRate = outcomeHitCount / eligibleFinishedCount * 100`
                </div>
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>予想試合数</span>
              </div>
              <div style={{ paddingLeft: 12 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>定義</span>：本人の `predictions` 件数
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>進捗</span>：`predictionCount / 104`（現状 104 試合を最大として表示）
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>設計メモ</div>
            <div style={{ color: "var(--muted-foreground)", lineHeight: "1.9" }}>
              <div>
                <span style={{ fontWeight: 900 }}>SSR/CSR</span>：トップのカウントダウンは hydration mismatch 回避のため、初回はプレースホルダーを描画してマウント後に更新
              </div>
              <div>
                <span style={{ fontWeight: 900 }}>公開プロフィール</span>：他人のプロフィール表示は `publicUsers` を参照（権限エラー回避）
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 900, fontSize: 16 }}>関連リンク</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link href="/" style={{ fontWeight: 900 }}>
                Home
              </Link>
              <Link href="/matches" style={{ fontWeight: 900 }}>
                予想する
              </Link>
              <Link href="/ranking" style={{ fontWeight: 900 }}>
                ランキング
              </Link>
              <Link href="/results" style={{ fontWeight: 900 }}>
                試合結果
              </Link>
              <Link href="/me" style={{ fontWeight: 900 }}>
                マイページ
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
