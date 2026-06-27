# k-ba-man サイト デザイン仕様書 final / Codex

**位置づけ**: 本書は `docs/visual-design/` 配下の既存仕様・調査結果を Codex として統合した、`site/` リニューアル実装の最終デザイン契約である。  
**参照元**: `design-spec.md`, `design-spec-re-plan.md`, `research-index.md`, `research-*.md` 全14本、および現行 `site/` 実装の確認結果。  
**対象**: 静的 SPA の公開サイト。バックエンド、予想ロジック、jinba/haibun エージェント仕様は対象外。

---

## 0. Codex 最終判断

### 採用する方向

- k-ba-man は「競馬予想の便利ツール」ではなく、**10人の予想屋が数字で席を守る群像メディア**として見せる。
- 初見は5秒で「キャラ × 競馬予想 × 成績競争」を理解でき、リピーターは2タップ以内で今週の予想ライブへ戻れることを最優先する。
- デザインの主役はキャラクター立ち絵、成績変動、予想の対立である。UI装飾はそれらを支える。
- 暗色基調は維持するが、単なる暗青スレート一色にしない。実画像、キャラカラー、金系アクセント、紙・金属の質感で階層を作る。
- 調査で提案されたトークン階層は採用する。実装は現行に合わせて単一 CSS ファイルを維持し、セクション整理と CSS custom properties で管理する。

### 明確に禁止するもの

- ヒーローを抽象グラデーションや SVG 装飾だけで成立させること。必ずキャラクター集合、競馬場、円卓など実体のあるビジュアルを使う。
- ページセクション全体を浮いたカードにすること。カードは個別アイテム、モーダル、反復リストに限定する。カード内カードは避ける。
- キャラカラーやステータス色だけで意味を伝えること。ラベル、形状、アイコン、位置も併用する。
- `color-mix(in srgb, ...)` と `color-mix(in oklch, ...)` の混在。全て `in oklch` に統一する。
- `--surface` の無番号トークンを使い続けること。`--surface-0` から `--surface-3` に統一する。
- 静的 SPA なのにリアルタイム更新を示唆するカウントダウンや「更新中...」表示を置くこと。
- 文字サイズを `vw` でスケールさせること。文字は固定トークンとブレイクポイントで制御する。
- letter-spacing で世界観を作ること。元資料の字間トークン案は本最終仕様では採用せず、全体の `letter-spacing` は `0` とする。書体・ウェイト・余白・色で階層を作る。

---

## 1. プロダクト定義

k-ba-man は、10人の AI 予想専門家が毎週の重賞レースを予想し、その予想・根拠・結果・ランキング変動をコンテンツ化するメディアサイトである。

### 予想・配分・収支の主体

予想と買い目は別チームの成果として表示する。

| 表示対象 | 主体 | 表示名 | 扱い |
|---|---|---|---|
| 個別予想 | jinba 10人 | 10人の予想屋 | ◎○▲△、根拠、自信度、予想精度を表示する |
| 集合知 | jinba 10人の集約 | 集合知 | 上位馬確率、集合知◎、個人予想とのズレを表示する |
| 買い目 | haibun 5人または集約配分ロジック | 買い目ポートフォリオ | tickets、stake、払戻、収支、勝ち筋を表示する |
| キャラ成績 | jinba 個人 | 予想成績 | Brier、LogLoss、◎実績、網羅率。馬券収支とは混同しない |
| サイト収支 | 買い目ポートフォリオ | 累計収支 | 投資、払戻、回収率。個別キャラの収支ではない |

「累計収支」「的中率」がページ上に出る場合は、ラベルで主体を必ず明示する。例: `買い目ポートフォリオ累計収支`, `集合知◎的中率`, `龍之介 ◎3着内率`。個別キャラに馬券収支を紐づける表示は禁止する。

### 表示上の免責

- サイトは予想コンテンツであり、馬券購入を推奨・保証するものではない。
- 買い目、オッズ、払戻、収支は娯楽目的の記録として表示する。
- 購入判断は利用者の責任で行う旨を、フッター、レース詳細モーダル、買い目表示付近のいずれかに常時到達可能な形で置く。
- 未成年者や購入できない地域のユーザーに向けて、購入行動を促す CTA は置かない。

### 席番号の固定マッピング

席番号は世界観上の固定識別子であり、成績順位で変動しない。前後ナビ、同点時ソート、ゲートストライプ、席番号バッジはこの順序に従う。

| 席 | id | 名前 | 流派 |
|---|---|---|---|
| 01 | `tatsunosuke` | 龍之介 | 血統・配合 |
| 02 | `makoto` | 誠 | データ・統計 |
| 03 | `misaki` | 美咲 | 展開・ペース読み |
| 04 | `kenta` | 健太 | スピード指数 |
| 05 | `teppei` | 鉄平 | 調教・仕上がり |
| 06 | `sakura` | さくら | オッズ・市場分析 |
| 07 | `aoi` | 葵 | 騎手・厩舎 |
| 08 | `hina` | 陽菜 | 穴党・逆張り |
| 09 | `yuko` | 優子 | 堅実本命 |
| 10 | `goro` | 吾郎 | 馬場読み・トラックバイアス |

### ユーザーに伝えること

1. 10人のキャラクターがそれぞれ違う流派で予想している。
2. 予想は当たり外れで終わらず、席次と物語に反映される。
3. 集合知と個人予想のズレが、このサイトの面白さである。
4. 外れや下位転落も隠さない。負けが次回のフックになる。

### 成功条件

- 初見ユーザーが5秒で「競馬予想」「キャラクター」「順位競争」の3要素を把握できる。
- 任意ページから `#/live` へ2タップ以内で到達できる。
- 320px幅で主要ナビ、カード、ランキング行、モーダル本文が横スクロールなしに読める。
- 10人の一覧で、名前、流派、席番号、テーマカラー、立ち絵の違いが一目で分かる。
- 成績ページで、暫定席次、Brier、LogLoss、◎3着内率、網羅率の意味とソート状態が分かる。
- ライブ結果フェーズで、着順、収支、各キャラの答え合わせ、集合知とのズレ、勝ち筋を辿れる。

---

## 2. 情報設計

### 主要ルート

| ルート | 表示名 | 役割 | 優先度 |
|---|---|---|---|
| `#/overview` | Overview | 初見の理解、最新状況、各ページへの入口 | P0 |
| `#/live` | 予想ライブ | 今週のレース、3フェーズ、個別予想、結果 | P0 |
| `#/results` | 成績 | ランキングとレース履歴 | P0 |
| `#/characters` | キャラクター | 10人の一覧 | P0 |
| `#/characters/:id` | キャラクター詳細 | 1人の流派・成績・関係性 | P0 |
| dialog | レース詳細 | 印、買い目、払戻、勝ち筋 | P1 |

旧「ランキング」と「成績履歴」は `#/results` に統合し、ページ内タブで「ランキング」「レース別」を切り替える。

### 導線

- `#/live` は全ページ共通ナビで常時表示し、ライブデータがある場合は視覚的に強調する。
- Overview のヒーロー直下にライブバナーを置く。リピーターがスクロールなしで今週の入口へ到達できること。
- キャラクターカード、ランキング行、ライブ個別予想カードのキャラ名・画像は詳細ページへリンクする。
- キャラクター詳細の前後ナビは席番号順で固定する。成績順位順にはしない。
- レース詳細はページ遷移ではなく `<dialog>` で開く。モバイルではボトムシートに変形する。

---

## 3. ページ仕様

### 3-1. Overview

目的は、初見に世界観を伝え、リピーターを今週のライブへ戻すこと。

必須要素:

- ファーストビューの H1 は `k-ba-man` とする。価値説明はサブコピーに置く。
- サブコピーには `AI`, `競馬予想`, `10人`, `席次競争` の意味が必ず入る文言を置く。
- ヒーローはキャラクター集合ビジュアル、円卓、競馬場など実体のある画像を背景または主ビジュアルにする。
- ヒーロー高は画面を埋め切らず、どの viewport でも次セクションの気配が見えるようにする。
- CTA は Primary `予想ライブを見る`、Secondary `成績を見る`、Tertiary `10人を見る` の3段階。
- ヒーロー直下に、ライブデータがある場合のみ「予想ライブバナー」を表示する。
- 「今週の円卓」帯として、直近レースから生成したドラマ要約を1から2文で表示する。
- サマリー統計は4項目まで。記録レース数、累計収支、的中率、暫定首位を基本とする。
- 上位3名ミニカード、10人一覧への導線、最新レース結果ダイジェストを配置する。
- About は折りたたみで下部に置く。初見の主要動線を妨げない。

### 3-2. 予想ライブ

目的は、今週のレースを「告知 - 予想 - 結果」の流れとして追わせること。

必須要素:

- ページ冒頭に対象レース名、発走時刻、条件、現在フェーズ、最終更新日時を表示する。
- フェーズナビは `<ol>` ベースの3ステップで、現在フェーズに `aria-current="step"` を付ける。
- デスクトップはステッパー、620px以下はセグメンテッドコントロールにする。
- 集合知パネルには ◎○▲△ と上位馬確率を表示する。
- 個別予想カードは、キャラ、印、根拠テキスト、自信度を含む。
- 集合知◎と個人◎が異なる場合は「独自路線」ピルを表示する。否定的な文言は使わない。
- 結果フェーズでは、着順、払戻、各キャラの答え合わせ、ランク変動、直近3戦の◎結果を表示する。
- データ未登録時は空状態を表示する。架空の進行中表現を置かない。

フェーズ別の表示契約:

| フェーズ | 表示する | 表示しない | 空状態 |
|---|---|---|---|
| 告知 | レース名、発走、条件、出走予定、最終更新、予想公開予定 | 集合知、個別印、買い目、結果 | `次の予想は準備中です` |
| 予想 | 集合知、上位馬確率、個別予想カード、独自路線ピル、最終更新 | 着順、払戻、収支確定、答え合わせ | `予想データがまだ登録されていません` |
| 結果 | 着順、払戻、買い目ポートフォリオ、各キャラ答え合わせ、ランク変動、勝ち筋 | 未確定オッズを確定値のように見せる表示 | `結果は未確定です` |

静的 SPA の更新はページ再読み込みで反映される。必要な場合は `最新データを読み込む` ボタンを置き、動作は `location.reload()` とする。

モバイル:

- 個別予想カードは初期状態でコンパクト表示にし、`<button>` で展開できる。展開ボタンには `aria-expanded` と `aria-controls` を付け、Enter / Space で操作できること。
- ファーストビュー内にレース名、フェーズ、主要CTAが収まること。

### 3-3. 成績

目的は、10人の序列とレースごとの履歴を正確に読ませること。

必須要素:

- ページ内タブ: `ランキング` / `レース別`
- ランキングソート: 暫定スコア、Brier、本命実績、網羅平均、LogLoss
- デスクトップは列ヘッダークリックでソートする。
- モバイルは `<select>` でソート基準を切り替え、行には選択中の指標だけを出す。
- ソート中の列だけに `aria-sort` を付与する。他列に `aria-sort="none"` は付けない。実装が `<table>` の場合は `<th scope="col" aria-sort="..."><button>...</button></th>` とし、div table の場合も同等の role と button を置く。
- ソート結果は `aria-live="polite"` で「暫定スコア降順で並び替えました」のように通知する。
- 暫定席次8から10位は降格圏として静的に強調する。8位は弱、9位は中、10位は強。
- 降格圏は物語演出であり、実運用の降格確定ではない旨を近くに表示する。
- レース別タブには累計統計、レースカード、レース詳細モーダル導線を置く。

### 3-4. キャラクター一覧

目的は、10人をビジュアルで覚えさせ、詳細ページへ進ませること。

必須要素:

- 10人分のカードを席番号順に表示する。
- 各カードは画像面積を大きくし、画像:テキストをおおむね 6:4 から 7:3 にする。
- 表示項目は、席番号、名前、二つ名、流派、直近成績サマリー、象徴モチーフ。
- `real.png` を使う。150px未満の用途では使わない。
- カード全体をリンクにする。ホバーは軽いリフトとボーダー変化まで。

グリッド:

| 幅 | カラム |
|---|---|
| 880px以上 | 5列 |
| 621pxから879px | 3列 |
| 620px以下 | 1列 |

### 3-5. キャラクター詳細

目的は、1人の予想屋を「応援したい対象」にすること。

必須要素:

- プロフィールヒーローに `real.png` を大きく表示する。
- 立ち絵には `box-shadow` ではなく `filter: drop-shadow()` を使う。
- 表示項目は、席番号、名前、二つ名、流派、座右の銘、成績サマリー、前後ナビ。
- 「この席に残る理由」を独立したドラマブロックとして表示する。
- 強み、弱点、関連キャラクター、成績履歴を続ける。
- 関連キャラクターは `relationships` の構造化データから解決する。本文から名前抽出しない。

モバイル:

- 立ち絵を先、テキストを後にする。
- 立ち絵高は `min(50vh, 360px)` を上限にし、ファーストビューに名前と導入が入るようにする。
- 前後ナビをページ下部にも複製する。

### 3-6. レース詳細モーダル

必須要素:

- 印、買い目、払戻、勝ち筋ナラティブ、答え合わせを表示する。
- デスクトップは中央モーダル、620px以下はボトムシート。
- モバイルのボトムシートは `max-height: 92dvh`、デスクトップは `max-height: 85dvh`。
- 背面スクロールは `<dialog>.showModal()` と `body` の状態クラスで抑止する。
- dialog にはアクセシブル名を付ける。原則として見出し id を `aria-labelledby` で参照する。
- 開いた直後のフォーカスは閉じるボタンまたは見出しに移し、閉じた後は opener へ戻す。
- 閉じるボタンは sticky にし、アイコンのみの場合は `aria-label="閉じる"` を付ける。
- ボトムシート本体は `overscroll-behavior: contain` と safe-area padding を持つ。Safari で `@starting-style` が未対応の間は閉じアニメーションを必須にしない。

---

## 4. デザインシステム

### 4-1. トークン階層

トークンは設計上は Primitive、Semantic、Component の3層で考える。ただし `site/styles.css` の実装では、トークン肥大化を避けるため **Semantic tokens + キャラカラー動的注入 + 必要最小限の Component aliases** に圧縮してよい。Primitive の生値は `:root` 内の採用値として管理し、コンポーネントごとに増やしすぎない。

CSS セクション:

```css
/* 1. TOKENS */
/* 2. RESET */
/* 3. TYPOGRAPHY */
/* 4. BRAND */
/* 5. LAYOUT */
/* 6. COMPONENTS */
/* 7. PAGE-SPECIFIC */
```

命名:

- 色・余白・型などの基盤: `--color-*`, `--space-*`, `--type-*`
- 意味を持つ色: `--text-*`, `--surface-*`, `--status-*`
- コンポーネント固有: `--button-*`, `--card-*` など必要最小限
- 状態クラス: `is-active`, `is-current`, `is-loading`
- JS フック: `data-*`

移行期間:

- 既存 CSS の `--bg`, `--surface`, `--ink`, `--text`, `--muted`, `--accent` は一括削除しない。最初の移行では alias を置き、参照を段階的に `--surface-*`, `--text-*`, `--char-color` へ寄せる。
- Google Fonts は CSS `@import` ではなく HTML の `<link rel="preconnect">` / `<link rel="stylesheet">` を基本とする。Critical CSS を inline 化する場合に `@import` が CSS 先頭制約で邪魔になるため。

### 4-2. 色

全ての新規色は OKLCH を基本にする。既存 hex は段階的に置換する。`oklch()` は 2026年時点で L/C/H の個別チャネルに `var()` を差し込めないため、ページ別に色温度を変える場合は完全な `oklch(...)` 値を定義するか、JS で完成済みの値を `style.setProperty()` する。

```css
:root {
  color-scheme: dark;

  --surface-0: oklch(0.08 0.010 270);
  --surface-1: oklch(0.12 0.012 270);
  --surface-2: oklch(0.16 0.014 270);
  --surface-3: oklch(0.20 0.016 270);

  --text-strong: oklch(0.92 0.020 95);
  --text-body:   oklch(0.75 0.018 95);
  --text-muted:  oklch(0.64 0.035 270);
  --text-faint:  oklch(0.42 0.035 270);

  --border-subtle: oklch(0.25 0.020 270);
  --border-strong: oklch(0.35 0.030 270);

  --status-win:   oklch(0.72 0.150 80);
  --status-place: oklch(0.72 0.100 270);
  --status-out:   oklch(0.68 0.180 25);
  --status-up:    oklch(0.70 0.150 150);
  --status-down:  oklch(0.72 0.140 45);
  --focus-ring:   oklch(0.72 0.160 250);

  --char-tatsunosuke: oklch(0.50 0.16 20);
  --char-makoto:      oklch(0.50 0.12 195);
  --char-misaki:      oklch(0.50 0.16 270);
  --char-kenta:       oklch(0.50 0.13 130);
  --char-teppei:      oklch(0.52 0.14 55);
  --char-sakura:      oklch(0.50 0.16 320);
  --char-aoi:         oklch(0.50 0.15 235);
  --char-hina:        oklch(0.50 0.16 350);
  --char-yuko:        oklch(0.50 0.12 165);
  --char-goro:        oklch(0.50 0.12 90);

  --gate-01: var(--char-tatsunosuke);
  --gate-02: var(--char-makoto);
  --gate-03: var(--char-misaki);
  --gate-04: var(--char-kenta);
  --gate-05: var(--char-teppei);
  --gate-06: var(--char-sakura);
  --gate-07: var(--char-aoi);
  --gate-08: var(--char-hina);
  --gate-09: var(--char-yuko);
  --gate-10: var(--char-goro);
}
```

`--text-muted` は現行 `#62647a` から必ず明るくする。`--surface-0` から `--surface-3` の全てで WCAG AA 4.5:1 以上を満たすこと。

キャラカラーは以下を採用値とする。既存の赤・緑・暖色渋滞を解消するため、色相はおおむね30度以上の間隔で配置する。キャラカラーの明度帯は L:0.50前後、ステータスカラーは L:0.68以上に分離する。

| id | 名前 | 採用色 |
|---|---|---|
| `tatsunosuke` | 龍之介 | `var(--char-tatsunosuke)` |
| `makoto` | 誠 | `var(--char-makoto)` |
| `misaki` | 美咲 | `var(--char-misaki)` |
| `kenta` | 健太 | `var(--char-kenta)` |
| `teppei` | 鉄平 | `var(--char-teppei)` |
| `sakura` | さくら | `var(--char-sakura)` |
| `aoi` | 葵 | `var(--char-aoi)` |
| `hina` | 陽菜 | `var(--char-hina)` |
| `yuko` | 優子 | `var(--char-yuko)` |
| `goro` | 吾郎 | `var(--char-goro)` |

キャラカラーの派生:

```css
.character-scope {
  --char-vivid: var(--char-color);
  --char-border: color-mix(in oklch, var(--char-color), var(--border-subtle) 55%);
  --char-wash: color-mix(in oklch, var(--char-color) 12%, var(--surface-1));
  --char-translucent: color-mix(in oklch, var(--char-color), transparent 88%);
}
```

用途:

- `vivid`: 席番号、細いボーダー、重要なキャラ識別
- `char-border`: ホバー境界、カード枠
- `char-wash`: カード背景、ドラマブロックなど不透明な面
- `char-translucent`: グロー、薄いオーバーレイ。背景色に依存するため広い塗りには使わない

席番号バッジは `var(--char-*)` 系の背景 + AA を満たす foreground を基本とする。文字色を白で固定する場合、背景は `color-mix(in oklch, var(--char-color) 80%, black)` などで AA を満たすまで暗くする。

### 4-3. タイポグラフィ

書体:

- 見出し・キャラ名: `Shippori Mincho B1`
- 本文: `Noto Sans JP`
- 数値: `JetBrains Mono`

```css
:root {
  --type-xs: 0.75rem;
  --type-sm: 0.90rem;
  --type-base: 1rem;
  --type-md: 1.333rem;
  --type-lg: 1.777rem;
  --type-xl: 2.369rem;
  --type-2xl: 3.157rem;

  --leading-body: 1.7;
  --leading-heading: 1.2;
}
```

ルール:

- `letter-spacing: 0` を基本とする。ラベルや見出しでも広げない。
- 数値には `font-variant-numeric: tabular-nums` を必ず指定する。
- 本文の行長は日本語で35から48文字程度に収める。
- Web Font は `font-display: swap` と fallback metrics 調整で CLS を抑える。
- `body` に `-webkit-font-smoothing: antialiased` と `-moz-osx-font-smoothing: grayscale` を指定する。

### 4-4. 余白・グリッド

```css
:root {
  --max: 1200px;
  --page-px: clamp(1rem, 0.7rem + 1.5vw, 2.5rem);
  --space-sm: 0.75rem;
  --space-md: 1.5rem;
  --space-lg: 2.5rem;
  --space-section: clamp(3rem, 2.4rem + 3vw, 6rem);
  --radius-sm: 3px;
  --radius-md: 6px;
}
```

ブレイクポイント:

| 名前 | 値 | 意味 |
|---|---|---|
| `bp-sm` | 620px | モバイル / タブレット |
| `bp-md` | 880px | タブレット / デスクトップ |

`bp-sm` / `bp-md` は文書上の定数であり、CSS custom property として `@media (max-width: var(--bp-sm))` のように使わない。ビルドなし CSS では media query に `620px` / `880px` をリテラルで書く。

ルール:

- コンテンツ最大幅は1200px。
- ページ左右は `--page-px`。
- セクション間は `--space-section`。
- カード内 padding は14から20px。
- カード角丸は8px以下。現行の3px/6pxを基本とする。
- ヒーローとプロフィールヒーローはフルブリード、内部コンテンツだけ中央寄せにする。

### 4-5. サーフェス

サーフェスは4段階まで。

| Token | 用途 |
|---|---|
| `--surface-0` | ページ背景、最奥 |
| `--surface-1` | 通常カード、セクション内の面 |
| `--surface-2` | 入力、タブ、強調の浅い面 |
| `--surface-3` | hover、最前面カード、モーダル |

ダークテーマでは影より明度差を主に使う。`box-shadow` は補助で、色付きグローの多用は禁止する。`backdrop-filter` は基本不採用。

### 4-6. モーション

```css
:root {
  --duration-fast: 150ms;
  --duration-medium: 300ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0.01ms;
    --duration-medium: 0.01ms;
  }
}
```

ルール:

- ホバーは150ms、展開は250から350ms。
- リフトは `translateY(-2px)` から `translateY(-4px)` まで。
- 回転、バウンス、過剰な飛び出しは使わない。
- キャラカード10枚の stagger は `30ms * index`、合計0.3秒以内。
- View Transitions API は採用可。非対応環境は即時切り替えでよい。
- FLIP ソートアニメーションは P2。`prefers-reduced-motion` では無効化する。

---

## 5. ブランド要素

### ロゴ

- ヘッダーは「K 円形バッジ + k-ba-man ロゴタイプ」のロックアップ。
- K バッジは最小28px。
- P1 で SVG 化する。フォント読み込み前でも崩れないこと。
- favicon は `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` の3ファイル構成。

### アイコン

- SVG スプライト方式を採用する。`<symbol>` + `<use>` で inline 使用。
- 全アイコンは `viewBox="0 0 24 24"`、stroke 1.5px、round cap/join。
- サイズは16px、20px、24pxの3段階。
- `currentColor` で着色する。
- 象徴モチーフは10人全員に付与する。

| キャラ | モチーフ |
|---|---|
| 龍之介 | 巻物 |
| 誠 | タブレット |
| 美咲 | 指し棒 |
| 健太 | 指数カード |
| 鉄平 | ストップウォッチ |
| さくら | スマホ |
| 葵 | 双眼鏡 |
| 陽菜 | 馬券 |
| 優子 | チェックボード |
| 吾郎 | 風速計 |

### 記号

| 記号 | 意味 | 表示 |
|---|---|---|
| ◎○▲△ | 印 | 日本語フォントで固定。色分けしない |
| 01から10 | 席番号 | 円形バッジ。キャラカラー背景 + AA を満たす文字色 |
| rank | 順位 | 等幅数値。gold系 |
| win/place/out | 的中結果 | pill。gold / 藍 / 赤 |
| 独自路線 | 集合知と異なる本命 | 藍系 pill + 分岐アイコン |

### ゲートストライプ

- 10色ストライプはブランド要素として残す。
- 使用場所はヒーロー下またはフッター上の1箇所に限定する。
- ぼかしグラデーションにしない。10色が識別できる細帯にする。
- 色は `--gate-01` から `--gate-10` から生成し、ハードコードしない。

---

## 6. 画像・ビジュアル

### アセット使い分け

| 文脈 | 画像 | ルール |
|---|---|---|
| キャラ一覧カード | `real.png` | 最小150px幅。バストから全身寄り |
| ランキング行 | `mini.png` | 44px前後の円形マスク |
| ライブ予想カード | `mini.png` | 48px前後の円形マスク |
| プロフィールヒーロー | `real.png` | 300px以上。全身表示 |
| OGP | 集合ビジュアル | 1200x630px |

画像表示:

- `real.png` を小さいサムネ用途に使わない。
- P0 で WebP 派生を生成する。`mini.webp` は400px幅・30KB以下、`real-card.webp` は360px幅・80KB以下、`real-profile.webp` は800px幅・180KB以下、ヒーロー/集合画像は表示幅に応じた派生を用意し、初期表示候補は300KB以下を目標にする。
- `<picture>` で WebP を優先し、PNG を fallback とする。AVIF は将来追加でよい。
- 画像コンテナには `aspect-ratio` または固定寸法を設定する。
- 全ての `<img>` に `width` と `height` を明示する。
- LCP 候補の主画像のみ `loading="eager" fetchpriority="high"`。ファーストビュー内に確実に入るキャラカード画像は `loading="eager"` だが `fetchpriority="high"` は付けない。それ以外は `loading="lazy"`。
- 透過 PNG の影は `filter: drop-shadow()` を使う。
- `object-position` は、キャラ一覧カードでは `center 25%`、プロフィール詳細では `center bottom`、ランキング/ライブの円形サムネでは `center 20%` を基本にする。

ページ背景:

| ページ | 主ビジュアル |
|---|---|
| Overview | 10人集合ビジュアル |
| 予想ライブ | トラック朝焼け |
| 成績 | 監査室 |
| キャラクター一覧 | 円卓の間または集合背景 |
| キャラクター詳細 | キャラ別背景。基本は円卓の間 |

和紙テクスチャはヒーローなど限定領域にのみ使用する。画面全体への `feTurbulence` 適用は避ける。

---

## 7. アクセシビリティ

必須:

- スキップリンクを body 先頭に置く。
- ルート変更時は `<main tabindex="-1">` にフォーカスし、`aria-live="polite"` の route announcer でページ名を通知する。
- ナビ現在地は `aria-current="page"`。
- フェーズ現在地は `aria-current="step"`。
- 予想ライブのフェーズ表示はプロセス表示であり、ユーザーが複数パネルを切り替えない場合は tab role を使わず `<ol>` + `aria-current="step"` とする。ユーザーがパネルを切り替える UI にする場合のみ `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`, `aria-controls`, roving tabindex, Arrow / Home / End キー操作を実装する。
- 成績ページのランキング/レース別タブは `role="tablist"`, `role="tab"`, `role="tabpanel"` を使う。
- モーダルは `<dialog>` + `showModal()` を使う。
- フォーカスリングは暗色背景で十分に見える青系またはキャラカラー mid を使う。
- コントラストは WCAG 2.2 AA を最低基準にする。OKLCH の L 値だけで判断せずツールで確認する。
- 印記号は `aria-label` か隣接テキストで意味を補足する。
- SVG アイコンが装飾の場合は `aria-hidden="true"`、アイコンのみボタンの場合は `aria-label` を必須にする。
- `forced-colors: active` では、ピルや降格圏を色だけに依存させず、border、テキスト、シンボルで状態が残るようにする。
- `prefers-reduced-motion` は View Transitions、stagger、bottom sheet、pulse、FLIP を対象にし、実質的に即時切り替えにする。

alt:

| 文脈 | alt |
|---|---|
| ランキング/ライブの小サムネイル | `alt=""` |
| キャラ一覧の主画像 | `alt="[名前]の立ち絵"`。外見差分がコンテンツとして重要な場合は短い外見描写を足す |
| プロフィールヒーロー | `alt="[名前]の立ち絵"` |
| 画像単独で識別子になる | `alt="[名前] - [簡潔な外見描写]"` |
| ランキングサムネイル | `alt=""` |
| OGP/集合画像 | `alt="k-ba-man の10人の予想屋キャラクター"` |

---

## 8. パフォーマンス

P0:

- 全 script に `defer` を付ける、または `type="module"` にする。
- 全画像に `width` / `height` を明示する。
- `mini.png` と `real.png` の WebP 派生を生成し、上記のサイズ予算を満たす。
- LCP 候補のヒーロー画像を preload する。
- `--text-muted` を AA 達成値へ修正する。
- 同期的な大規模 DOM 追加は `DocumentFragment` でまとめる。

P1:

- ファーストビューに必要な tokens、reset、header、hero CSS を3KB程度で inline 化する。
- 画像の `srcset` / `sizes` を調整し、320pxから1920pxで過剰転送を避ける。
- パッシブスクロールリスナーとイベントデリゲーションを使う。

計測基準:

| 指標 | 目標 |
|---|---|
| LCP | 2.5s 以下 |
| CLS | 0.1 未満 |
| INP | 200ms 以下 |
| JS エラー | 0 |
| 320px 横スクロール | 0 |

測定条件:

- 対象ルートは `#/overview`, `#/live`, `#/results`, `#/characters`, `#/characters/:id`。
- Lighthouse mobile profile の cold cache を基準にする。localhost ではなく本番相当の静的配信で測る。
- INP は、ナビ遷移、成績ソート、キャラカード展開、レース詳細モーダル開閉を操作シナリオに含める。
- 受け入れ判定は「大きく反しない」ではなく、上記目標を満たすこと。未達の場合は計測結果と理由を記録する。

---

## 9. OGP・共有

初期はハッシュルート別 OGP を行わない。SNS クローラは `#` 以降を読まないため、共通 OGP を `site/index.html` に設定する。`PUBLIC_BASE_URL` を本番公開URLとして定義し、`example.com`, `localhost`, 相対URLを本番 HTML に残してはならない。

必須タグ:

```html
<link rel="canonical" href="{{PUBLIC_BASE_URL}}/">
<meta property="og:type" content="website">
<meta property="og:title" content="k-ba-man | 円卓の10人が数字で席を守る">
<meta property="og:description" content="10人のAI予想専門家が毎週の重賞を予想し、順位を競う。">
<meta property="og:url" content="{{PUBLIC_BASE_URL}}/">
<meta property="og:site_name" content="k-ba-man">
<meta property="og:locale" content="ja_JP">
<meta property="og:image" content="{{PUBLIC_BASE_URL}}/assets/og/ogp.png">
<meta property="og:image:alt" content="k-ba-man の10人の予想屋キャラクター">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="k-ba-man | 円卓の10人が数字で席を守る">
<meta name="twitter:description" content="10人のAI予想専門家が毎週の重賞を予想し、順位を競う。">
<meta name="twitter:image" content="{{PUBLIC_BASE_URL}}/assets/og/ogp.png">
<meta name="twitter:image:alt" content="k-ba-man の10人の予想屋キャラクター">
```

OGP 画像:

- 1200x630px。
- PNG または JPEG。WebP は使わない。
- LINE の正方形クロップを考慮し、重要要素は中央630x630pxに収める。
- 初期の共有ボタンは共通 OGP でよいことを明示した上で、現在の hash URL をコピーする。
- 将来、キャラ別・レース別共有が必要になったら `/share/characters/<id>.html` と `/share/races/<race_id>.html` を静的生成する。ページ別共有ボタンは hash URL ではなく share HTML の URL をコピーし、share HTML は OGP 設定後に対応する hash route へ誘導する。

---

## 10. モバイル仕様

viewport:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

620px以下:

- 底部タブバーを固定表示する。4主要ページをアイコン + 短ラベルで表示する。
- 高さは `calc(60px + env(safe-area-inset-bottom, 0px))`。
- `main` またはページコンテナに同等以上の下 padding を入れ、コンテンツが隠れないようにする。`html` には `scroll-padding-bottom`、フォーカス可能要素には必要に応じて `scroll-margin-bottom` を指定する。
- bottom nav は `nav aria-label="主要ナビゲーション"` を持ち、各項目は最低44px相当のタップ領域を持つ。
- ハンバーガーメニューは使わない。
- ランキングは選択中の指標1つだけを行に表示する。
- レース詳細はボトムシート。
- 予想ライブのフェーズはセグメンテッドコントロール。

621pxから879px:

- ヘッダー内に横スクロール可能なタブナビ。
- カードグリッドは2から3列。

880px以上:

- ヘッダー内水平ナビ。
- 成績テーブルは全主要指標を表示。

---

## 11. データ表示契約

### 表示用データフィールド

| データ | 必須フィールド |
|---|---|
| characters | `id`, `seat`, `name`, `school`, `title`, `color`, `motif`, `intro`, `drama`, `strengths`, `weakness`, `relationships`, `images` |
| live-race.v1 | `race`, `phase`, `updated_at`, `collective`, `predictions`, `betting`, `result` |
| race-history.v1 | `race`, `result`, `rankings`, `metrics`, `tickets`, `payouts`, `how_won` |

`relationships` は `{ target_id, type, axis, reason }` を持つ。`tickets` と `how_won` は買い目ポートフォリオの文脈で表示し、jinba 個人の予想根拠と混同しない。

### 暫定スコア

表示式は現行仕様を維持する。

```txt
max(0, (1 - meanBrier / 2) * 80)
+ honmeiWinRate * 12
+ max(0, honmeiHitRate - honmeiWinRate) * 6
+ (coverage / 3) * 2
```

表示:

- 小数1桁。
- 大きいほど上位。
- 同点時は平均Brier昇順、◎3着内率降順、席番号昇順。

### 指標説明

| 指標 | 意味 | 良い方向 | 注記 |
|---|---|---|---|
| Brier | 予測確率と結果のズレ | 低いほど良い | サンプル3レース未満は参考値 |
| LogLoss | 確率予測の外れ方の重さ | 低いほど良い | 極端な過信の失敗が重く出る |
| ◎勝率 | 本命が1着になった割合 | 高いほど良い | 直近偏重ではなく累計 |
| ◎3着内率 | 本命が3着以内に入った割合 | 高いほど良い | 堅実性の目安 |
| 網羅率 | 印が上位決着をどれだけ拾えたか | 高いほど良い | レースごとの表示定義に従う |
| 暫定スコア | 上記を合成した席次用スコア | 高いほど良い | 物語演出用であり公式評価ではない |

成績ページにはこの表を短縮した説明を置く。低いほど良い指標と高いほど良い指標が混在するため、ソート中の指標には方向ラベルを必ず表示する。

### 降格圏

- 記録3レース以上で暫定席次8から10位を降格圏として表示する。
- 3レース未満は「参考順位」とする。
- 10位が最も強く、9位、8位の順に弱める。

### 直近3戦

- 対象キャラの最新3レース分の `honmeiStatus` を新しい順に表示する。
- 3件未満は存在分のみ。0件時は「記録なし」。
- ドット型の視覚表現とテキスト要約を併用する。

### 対立マーカー

条件:

```js
collective.honmei !== expert.prediction.marks.honmei
```

表示:

- ラベルは「独自路線」。
- ツールチップまたは補足テキストは「集合知の本命とは異なる視点」。
- 失敗や逆張りを責める文言にはしない。

### 今週の円卓

Overview の「今週の円卓」は直近レースからテンプレート生成する。手書き更新を前提にしない。

優先順位:

1. 席次の最大上昇/下降がある場合は、そのキャラと変動幅を扱う。同率時は席番号順で代表を決める。
2. 集合知◎が的中または外れた場合は、集合知の結果を扱う。
3. 個人◎が集合知と異なり、かつ好走した場合は「独自路線」の成功として扱う。
4. 初回レース、結果未確定、データ不足の場合は空状態 `円卓は次の記録を待っている` を表示する。

文量は1から2文。誇張、断定、実際のデータにない心理描写は禁止する。

---

## 12. 実装優先度

### P0 - リニューアル実装と同時

- `--surface` を `--surface-0` から `--surface-3` に統一。
- `color-mix()` を全て `in oklch` に統一。
- キャラカラー新10色、`--gate-01` から `--gate-10`、`--char-vivid/border/wash/translucent` を導入。
- `--text-muted` と席番号バッジ foreground/background を AA 達成値に変更。
- `--max: 1200px`、`--page-px`、`--space-*` を導入。
- 全 script に `defer` または `type="module"`。
- viewport に `viewport-fit=cover`。
- 全画像に `width` / `height`。
- `mini.png` / `real.png` の WebP 派生と `<picture>` fallback。
- LCP 候補画像の preload。
- 共通 OGP と favicon 3ファイル構成。
- 底部タブバーの safe-area 対応。
- フェーズステッパーの `aria-current="step"`。
- ランキングソートの `aria-sort`。
- スキップリンク、focus-visible、route announcer。
- ステータスピル、席番号バッジ、独自路線ピルの共通 CSS。
- 予想/配分/収支の主体ラベル。
- 席番号固定マッピング。
- 「今週の円卓」帯。
- キャラクター詳細のドラマブロック。

### P1 - 見た目の完成度を上げる

- SVG アイコンスプライト。
- K ロゴ SVG 化。
- ヒーロー CTA 3段階階層。
- 関連キャラクターカード。
- 画像の `srcset` / `sizes` 最適化。

### P2 - 体験の磨き込み

- View Transitions API。
- FLIP ソートアニメーション。
- レース詳細ボトムシートの開閉アニメーション。
- キャラカード stagger。
- 共有用静的 HTML 生成。
- キャラ別・レース別 OGP 画像生成。

---

## 13. 受け入れチェックリスト

実装完了時に以下を確認する。

- 320px、620px、880px、1200px、1920pxで横スクロールがない。
- Overview のファーストビューに `k-ba-man`、キャラ/競馬の実ビジュアル、主要CTAが見える。
- Overview のサブコピーで `AI`, `競馬予想`, `10人`, `席次競争` の意味が伝わる。
- Overview ヒーロー下に次セクションの一部が見えている。
- 4主要ナビの現在地が視覚と `aria-current` の両方で分かる。
- 620px以下で底部タブバーが safe area と重ならない。
- `#/live` の3フェーズが告知、予想、結果の各データ状態で破綻しない。
- 買い目、払戻、収支の主体が「買い目ポートフォリオ」等のラベルで明示され、個別キャラ成績と混同しない。
- 成績ソートがキーボードで操作でき、現在のソートが読み上げ可能。
- 降格圏が色だけでなく左ボーダーやラベルでも分かる。
- キャラ一覧で10人の色・席番号・モチーフ・流派が識別できる。
- キャラ詳細で立ち絵が矩形影にならず、drop-shadow で自然に浮いている。
- レース詳細 dialog が Esc、閉じるボタン、フォーカストラップ、opener へのフォーカス復帰で操作できる。
- `prefers-reduced-motion: reduce` で主要アニメーションが実質無効化される。
- OGP タグが `index.html` に存在し、`og:image` と `og:url` が `PUBLIC_BASE_URL` の本番絶対URLであり、`example.com` / `localhost` / 相対URLが残っていない。
- Lighthouse または同等確認で、指定ルートと測定条件において LCP、CLS、INP の目標を満たす。
