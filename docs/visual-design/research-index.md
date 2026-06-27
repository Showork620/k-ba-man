# デザイン調査知見インデックス

design-spec.md の実現に必要なデザイン知識・技術の調査結果を集積したファイル群の索引。全14ファイル、約280KB。

## 調査ファイル一覧

### 第1ラウンド: 基盤技術

| ファイル | 主な対象 | design-spec 対応セクション |
|---|---|---|
| `research-color-system.md` | color-mix(), ダークテーマ, surface 階層, キャラ10色 | §4-2 カラーシステム, サーフェスとデプス |
| `research-typography.md` | 明朝×ゴシック混植, 等幅数値, CLS防止, ダークテーマ可読性 | §4-3 タイポグラフィ |
| `research-mobile-patterns.md` | 底部タブバー, ボトムシート, セグメンテッドコントロール | §4-4 モバイルナビ, §5-2, §5-6 |
| `research-motion-cards.md` | stagger, ホバー/フォーカス, ページ遷移, reduced-motion | §4-5 インタラクション, §4-2 サーフェス |
| `research-responsive-layout.md` | clamp(), CSS Grid, フルブリード, データテーブル, aspect-ratio | §4-4 レイアウト |

### 第2ラウンド: 品質・UX・コンテンツ

| ファイル | 主な対象 | design-spec 対応セクション |
|---|---|---|
| `research-accessibility.md` | スキップリンク, aria, キーボードナビ, コントラスト, alt | §4-6 アクセシビリティ |
| `research-performance.md` | Critical CSS, 画像最適化, CLS, vanilla SPA 最適化 | §4-7 パフォーマンス |
| `research-ogp-sharing.md` | OGPメタタグ, favicon, SNS対応, 共有用静的ページ | §7 OGP・共有 |
| `research-ranking-drama.md` | 降格圏演出, ソートUI, 週次ドラマ, 対立マーカー, 答え合わせ | §5-3 成績, §8 物語的コンテンツ |
| `research-character-ui.md` | キャラカード, プロフィールヒーロー, ドラマブロック, 世界観表現 | §5-4, §5-5 キャラクター, §4-2 ビジュアル方向性 |

### 第3ラウンド: 統合設計・ページ固有

| ファイル | 主な対象 | design-spec 対応セクション |
|---|---|---|
| `research-css-architecture.md` | トークン階層, ファイル構成, クラス設計, レスポンシブトークン | §6 技術制約, 横断 |
| `research-hero-landing.md` | フルブリードヒーロー, CTA階層, 導線帯, ゲートストライプ, 動的ヒーロー | §5-1 Overview, §4-8 ブランド |
| `research-phase-ui.md` | 3フェーズステッパー, 状態切替, 漸進的開示, リアルタイム感演出 | §5-2 予想ライブ |
| `research-icons-brand.md` | SVGアイコン, ロゴ「K」バッジ, ◎○▲△記号体系, ステータスピル | §4-8 ブランド, §3-1 象徴小物 |

## design-spec セクション → 調査ファイル 逆引き

| design-spec セクション | 主要参照ファイル | 補助参照 |
|---|---|---|
| §4-1 ブランド・トーン | character-ui | ranking-drama |
| §4-2 ビジュアル方向性 — カラー | color-system | css-architecture |
| §4-2 ビジュアル方向性 — サーフェス | color-system, motion-cards | css-architecture |
| §4-2 ビジュアル方向性 — 世界観 | character-ui | hero-landing |
| §4-3 タイポグラフィ | typography | css-architecture |
| §4-4 レイアウト — グリッド・余白 | responsive-layout | css-architecture |
| §4-4 レイアウト — モバイルナビ | mobile-patterns | responsive-layout |
| §4-5 インタラクション — モーション | motion-cards | phase-ui |
| §4-5 インタラクション — タッチ | mobile-patterns, motion-cards | — |
| §4-6 アクセシビリティ | accessibility | phase-ui (aria-current) |
| §4-7 パフォーマンス | performance | typography (CLS) |
| §4-8 ブランドアイデンティティ | icons-brand | ogp-sharing (favicon), hero-landing (ゲートストライプ) |
| §5-1 Overview | hero-landing | ranking-drama (ドラマ帯), character-ui |
| §5-2 予想ライブ | phase-ui | mobile-patterns, ranking-drama (対立マーカー) |
| §5-3 成績 | ranking-drama | responsive-layout (テーブル), accessibility (aria-sort) |
| §5-4 キャラクター一覧 | character-ui | responsive-layout (グリッド) |
| §5-5 キャラクター詳細 | character-ui | icons-brand (記号体系) |
| §5-6 レース詳細モーダル | mobile-patterns (ボトムシート) | ranking-drama (答え合わせ) |
| §5-7 週次ドラマ | ranking-drama (ドラマUI) | hero-landing (動的ヒーロー) |
| §7 OGP・SNS | ogp-sharing | icons-brand (favicon) |
| §8 物語的コンテンツ | ranking-drama | character-ui (ドラマブロック) |

## 横断的な主要知見

### 即座に活用できる CSS 新機能
- **`color-mix(in oklch, ...)`** — キャラカラーの dim/mid/vivid 3段階生成（color-system, character-ui, css-architecture）
- **`clamp()`** — 流体余白・フォントサイズ（responsive-layout, typography, css-architecture）
- **`aspect-ratio`** — CLS 防止の画像コンテナ（responsive-layout, performance）
- **View Transitions API** — SPA ページ遷移（motion-cards, phase-ui, hero-landing）
- **`<dialog>` + `showModal()`** — モーダル/ボトムシート（mobile-patterns, accessibility）
- **`@media (hover: hover)`** — タッチ/デスクトップ分岐（motion-cards）
- **`:focus-visible`** — キーボードナビ（accessibility, motion-cards）
- **`env(safe-area-inset-bottom)`** — 底部タブバー（mobile-patterns）
- **SVG `<symbol>` + `<use>`** — アイコンスプライトシステム（icons-brand）
- **CSS `@layer`** — カスケード管理の選択肢（css-architecture）

### 現行実装で発見された課題
- **画像サイズ超過**: mini.png が 460-613KB（目標 30KB の 17 倍）— performance
- **コントラスト不足**: `--muted` カラーが WCAG AA 未達 — typography, accessibility
- **キャラカラー色相渋滞**: 緑系2色・暖色系3色が近すぎる — color-system
- **OGP 未設定**: 共通メタタグが不足 — ogp-sharing
- **ロゴが CSS テキスト**: SVG 化推奨 — icons-brand
- **CTA 階層不明確**: Primary/Secondary の視覚差が不十分 — hero-landing

### 設計判断のガイドライン
- **CSS アーキテクチャ**: 2層トークン（Semantic + キャラカラー動的注入）、単一 CSS ファイル継続、CUBE CSS 的クラス設計 — css-architecture
- **サーフェス階層**: OKLCH 明度ステップ（shadow は補助）— color-system
- **ダーク背景色**: 純黒でなく L:0.11 / C:0.008 のティント — color-system
- **ヒーロー**: gradient overlay で背景暗化、dvh/svh 対応、3段階 CTA 階層 — hero-landing
- **フェーズUI**: `<ol>` ステッパー + View Transitions でクロスフェード — phase-ui
- **ソートUI**: デスクトップはヘッダークリック、モバイルはドロップダウン — ranking-drama
- **降格圏**: 静的な背景色+左ボーダーの3段階強度（アニメーション不使用）— ranking-drama
- **対立マーカー**: ニュートラルな藍系「独自路線」ピル — ranking-drama
- **ドラマブロック**: 左ボーダー + キャラカラーティント + 明朝体 — character-ui
- **世界観テクスチャ**: SVG feTurbulence 和紙 + グラデーション金属ヘアライン — character-ui
- **アイコン**: SVG スプライト + `currentColor` 着色、24×24 viewBox 統一 — icons-brand
- **記号体系**: ◎○▲△ は日本語フォント固定、席番号は円形バッジ、ステータスは3色ピル — icons-brand

### 実装優先度の横断サマリー（P0 = 即対応）

| 優先度 | 項目 | 参照ファイル |
|---|---|---|
| P0 | surface 番号統一 + color-mix 色空間統一 | css-architecture |
| P0 | 余白トークン `--space-lg/md/sm` 導入 | css-architecture, responsive-layout |
| P0 | `--muted` コントラスト修正（AA 達成） | typography, accessibility |
| P0 | OGP 共通メタタグ追加 | ogp-sharing |
| P0 | 画像 width/height 属性明示（CLS 防止） | performance |
| P1 | キャラカラー dim/mid/vivid 3段階の統一定義 | color-system, css-architecture |
| P1 | 底部タブバー + safe-area 対応 | mobile-patterns |
| P1 | ステッパーUI（フェーズナビ） | phase-ui |
| P1 | SVG アイコンスプライト導入 | icons-brand |
| P1 | ヒーロー CTA 3段階階層 | hero-landing |
| P2 | View Transitions API + フォールバック | motion-cards, phase-ui |
| P2 | ボトムシート（620px 以下のモーダル） | mobile-patterns |
| P2 | FLIP ソートアニメーション | ranking-drama |
| P2 | SVG ロゴマーク化 | icons-brand |
| P3 | mini.png 圧縮（30KB 以下目標） | performance |
| P3 | WebP/AVIF 対応 | performance |
| P3 | 共有用静的 HTML 生成 | ogp-sharing |
