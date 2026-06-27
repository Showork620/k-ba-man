# レスポンシブレイアウト設計知見集

design-spec.md §4-4（レイアウト要件）の実現に必要な CSS 設計パターンと実装知識をまとめる。

---

## 1. CSS clamp() による流体デザイン

### 1-1. 基本構文と仕組み

```css
/* clamp(最小値, 推奨値, 最大値) */
padding-inline: clamp(16px, 4vw, 40px);
```

- **最小値**: ビューポートがどれだけ狭くても、この値より縮まない
- **推奨値**: ビューポート幅に連動して流体的にスケールする中間値（通常 `vw` を含む式）
- **最大値**: ビューポートがどれだけ広くても、この値を超えない

メディアクエリなしで、320px〜1920px の全域で滑らかにスケールする。

### 1-2. 推奨値の計算公式（線形補間）

「ビューポート幅 minVw で minSize、maxVw で maxSize」を実現する clamp の推奨値を求める公式:

```
slope = (maxSize - minSize) / (maxVw - minVw)
intercept = minSize - slope × minVw
推奨値 = intercept(rem) + slope × 100(vw)
```

#### 本プロジェクトの具体計算

**ページ左右パディング**: `clamp(16px, ?, 40px)` — 320px で 16px、1920px で 40px

```
slope = (40 - 16) / (1920 - 320) = 24 / 1600 = 0.015
intercept = 16 - 0.015 × 320 = 16 - 4.8 = 11.2px ≈ 0.7rem
推奨値 = 0.7rem + 1.5vw
```

→ `clamp(16px, 0.7rem + 1.5vw, 40px)` = `clamp(1rem, 0.7rem + 1.5vw, 2.5rem)`

**セクション間**: `clamp(48px, ?, 96px)` — 320px で 48px、1920px で 96px

```
slope = (96 - 48) / (1920 - 320) = 48 / 1600 = 0.03
intercept = 48 - 0.03 × 320 = 48 - 9.6 = 38.4px ≈ 2.4rem
推奨値 = 2.4rem + 3vw
```

→ `clamp(3rem, 2.4rem + 3vw, 6rem)`

**セクション内ブロック間**: `clamp(24px, ?, 40px)` — 320px で 24px、1920px で 40px

```
slope = (40 - 24) / (1920 - 320) = 16 / 1600 = 0.01
intercept = 24 - 0.01 × 320 = 24 - 3.2 = 20.8px ≈ 1.3rem
推奨値 = 1.3rem + 1vw
```

→ `clamp(1.5rem, 1.3rem + 1vw, 2.5rem)`

### 1-3. 3段階余白トークンの定義

design-spec は「大・中・小」の3段階を求めている。CSS カスタムプロパティで定義:

```css
:root {
  /* 余白トークン — 3段階 */
  --space-lg: clamp(3rem, 2.4rem + 3vw, 6rem);     /* セクション間 48–96px */
  --space-md: clamp(1.5rem, 1.3rem + 1vw, 2.5rem);  /* ブロック間 24–40px */
  --space-sm: 8px;                                    /* カード間ガター 8–12px → 固定で十分 */

  /* ページ左右パディング */
  --page-padding: clamp(1rem, 0.7rem + 1.5vw, 2.5rem);

  /* カード内パディング — 14–20px */
  --card-padding: clamp(0.875rem, 0.75rem + 0.5vw, 1.25rem);
}
```

### 1-4. アクセシビリティ上の注意

`vw` 単位はブラウザのズーム操作に追従しない。フォントサイズに clamp を使う場合は `rem + vw` の組み合わせが必須:

```css
/* NG: ズーム時にサイズが変わらない */
font-size: clamp(1rem, 3vw, 2rem);

/* OK: rem 成分がズームに追従する */
font-size: clamp(1rem, 0.8rem + 1vw, 2rem);
```

本プロジェクトでは余白とパディングが主な用途であり、フォントサイズへの clamp 適用は慎重に行う。

---

## 2. CSS Grid によるレスポンシブカードグリッド

### 2-1. auto-fit + minmax パターン（メディアクエリ不要）

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(220px, 100%), 1fr));
  gap: var(--space-sm);
}
```

- `auto-fit`: 入るだけカラムを作り、余った空トラックは 0 幅に潰す
- `minmax(min(220px, 100%), 1fr)`: 各カラムは最低 220px（ただし画面幅が 220px 未満なら 100%）
- `min()` で包むのが 2025 以降のベストプラクティス。これなしだと画面幅 < minmax の最小値でオーバーフローする

#### auto-fit vs auto-fill

| | auto-fit | auto-fill |
|---|---|---|
| 空トラック | 0 幅に潰れる（残りの列が伸びる） | 最小幅で残り、空セルが見える |
| 用途 | カードグリッド全般 | プレースホルダを見せたいとき |

本プロジェクトでは **auto-fit を使う**（10人固定なので空トラックの問題は起きにくいが、レースカードなど可変数のグリッドでも auto-fit が自然）。

### 2-2. 各コンテキストの推奨パターン

#### キャラクター一覧（5列→3列→1列）

auto-fit だけでは「デスクトップで必ず5列」のコントロールが難しい。**メディアクエリ併用**が適切:

```css
.character-grid {
  display: grid;
  gap: var(--space-sm);
  grid-template-columns: 1fr; /* モバイルデフォルト: 1列 */
}

@media (min-width: 621px) {
  .character-grid {
    grid-template-columns: repeat(3, 1fr); /* タブレット: 3列 */
  }
}

@media (min-width: 881px) {
  .character-grid {
    grid-template-columns: repeat(5, 1fr); /* デスクトップ: 5列 */
  }
}
```

5列固定はデザイン上の決定（10人を2行で見せる意図）なので、auto-fit に任せるより明示が良い。

#### 予想カード（Live）（2列→2列→1列）

```css
.prediction-grid {
  display: grid;
  gap: var(--space-sm);
  grid-template-columns: 1fr;
}

@media (min-width: 621px) {
  .prediction-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

#### 統計タイル（4列→2列→2列）

```css
.stat-tiles {
  display: grid;
  gap: var(--space-sm);
  grid-template-columns: repeat(2, 1fr); /* モバイルでも2列 */
}

@media (min-width: 881px) {
  .stat-tiles {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

#### ランキング行

テーブル的な構造なので Grid よりも flexbox + メディアクエリで対応する（後述の §4 参照）。

### 2-3. 判断基準: auto-fit vs メディアクエリ

| 条件 | 推奨 |
|---|---|
| カラム数に明確なデザイン意図がある | メディアクエリ |
| アイテム数が可変でカラム数を自動調整したい | auto-fit + minmax |
| 両方 | auto-fit をベースに、特定ブレイクポイントで max-columns を上書き |

本プロジェクトは10人固定・レースカード可変なので、固定グリッドはメディアクエリ、可変グリッドは auto-fit を使い分ける。

---

## 3. フルブリード + センター寄せの共存

### 3-1. Josh Comeau のフルブリードレイアウト

ヒーローはフルブリード（画面幅いっぱい）、コンテンツは max-width: 1200px でセンター寄せ。これを CSS Grid で統一的に実現する手法。

#### 基本（3カラム Grid）

```css
.page-layout {
  display: grid;
  grid-template-columns:
    1fr
    min(var(--max), 100% - var(--page-padding) * 2)
    1fr;
}

.page-layout > * {
  grid-column: 2; /* デフォルトで中央カラム */
}

.page-layout > .full-bleed {
  grid-column: 1 / -1; /* 全カラムにまたがる */
}
```

- `1fr` の左右カラムが余白を吸収
- 中央カラムは `min(1200px, 100% - パディング×2)` で、狭い画面ではパディングを残しつつ縮む
- `.full-bleed` は `1 / -1`（最初から最後まで）で左右いっぱいに広がる

#### 利点

- `max-width` + `margin: 0 auto` よりも柔軟
- フルブリード要素のために wrapper を出入りする必要がない
- Grid の名前付きラインと組み合わせるとさらに拡張可能

### 3-2. Ryan Mulligan の Layout Breakouts（拡張版）

Josh Comeau のパターンを発展させ、5段階の幅バリエーションを名前付きラインで定義:

```css
.page-layout {
  --content: min(var(--max), 100% - var(--page-padding) * 2);
  --popout: minmax(0, 2rem);  /* content より少し広い */
  --full: minmax(0, 1fr);     /* 画面端まで */

  display: grid;
  grid-template-columns:
    [full-start] var(--full)
    [popout-start] var(--popout)
    [content-start] var(--content) [content-end]
    var(--popout) [popout-end]
    var(--full) [full-end];
}

.page-layout > * {
  grid-column: content;
}

.page-layout > .popout {
  grid-column: popout;
}

.page-layout > .full-bleed {
  grid-column: full;
}
```

#### 本プロジェクトへの適用

- **full-bleed**: ヒーロー、プロフィールヒーロー、10色ストライプ帯
- **popout**: 画像やビジュアル要素を少しだけはみ出させたいとき
- **content**: 通常のテキスト・カード領域

最初は Josh Comeau の3カラム版で十分。popout が必要になったら Mulligan 版に拡張する。

### 3-3. 実装例（本プロジェクト向け）

```css
:root {
  --max: 1200px;
  --page-padding: clamp(1rem, 0.7rem + 1.5vw, 2.5rem);
}

.page-layout {
  display: grid;
  grid-template-columns:
    1fr
    min(var(--max), 100% - var(--page-padding) * 2)
    1fr;
}

.page-layout > * {
  grid-column: 2;
}

.full-bleed {
  grid-column: 1 / -1;
  width: 100%;
}
```

---

## 4. レスポンシブデータテーブル

### 4-1. パターンの選択

design-spec はランキングテーブルに対して:
- デスクトップ: 1行に全指標（順位 + キャラ + 指標5列）
- モバイル(620px以下): 「順位 + キャラ画像・名前 + ソート中の指標1つだけ」+ タップ展開

これは **Priority Columns + Expandable Rows** の複合パターン。

### 4-2. 推奨実装: flexbox ベースのカード変形

`<table>` ではなく、`<div>` ベースのセマンティックな構造 + ARIA で実装する方が、モバイル変形が容易:

```html
<div class="ranking-list" role="table" aria-label="ランキング">
  <div class="ranking-row" role="row">
    <div class="rank-num" role="cell">1</div>
    <div class="rank-char" role="cell">
      <img src="..." alt="龍之介" class="rank-avatar">
      <span class="rank-name">龍之介</span>
      <span class="rank-title">血統・配合</span>
    </div>
    <!-- デスクトップ表示の指標列 -->
    <div class="rank-stat" data-label="暫定" role="cell">74.2</div>
    <div class="rank-stat" data-label="Brier" role="cell">0.312</div>
    <div class="rank-stat" data-label="◎3着内" role="cell">45%</div>
    <div class="rank-stat" data-label="網羅" role="cell">2.1</div>
    <div class="rank-stat" data-label="LogLoss" role="cell">1.82</div>
    <!-- モバイル表示: ソート中の指標のみ -->
    <div class="rank-active-stat" role="cell">
      <span class="stat-label">暫定</span>
      <span class="stat-value">74.2</span>
    </div>
  </div>
</div>
```

```css
.ranking-row {
  display: flex;
  align-items: center;
  padding: var(--card-padding);
  border-bottom: 1px solid var(--border);
}

.rank-stat {
  flex: 0 0 auto;
  width: 80px;
  text-align: right;
  font-family: var(--f-mono);
  font-variant-numeric: tabular-nums;
}

.rank-active-stat {
  display: none; /* デスクトップでは非表示 */
  margin-left: auto;
}

@media (max-width: 620px) {
  .rank-stat {
    display: none; /* モバイルでは全指標を隠す */
  }

  .rank-active-stat {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
}
```

### 4-3. ソート中の指標の動的切り替え

JavaScript で `data-sort` 属性を更新し、CSS で制御する方法:

```css
/* data-sort 属性に応じて、対応する指標だけ表示 */
.ranking-row[data-sort="brier"] .rank-active-stat::before {
  content: attr(data-brier);
}
```

もしくはシンプルに JS で `.rank-active-stat` のテキストを書き換える:

```js
function updateMobileSort(sortKey) {
  document.querySelectorAll('.ranking-row').forEach(row => {
    const stat = row.querySelector(`.rank-stat[data-label="${sortKey}"]`);
    const mobile = row.querySelector('.rank-active-stat');
    mobile.querySelector('.stat-label').textContent = sortKey;
    mobile.querySelector('.stat-value').textContent = stat.textContent;
  });
}
```

### 4-4. タップ展開（Expandable Rows）

モバイルで行タップ → 全指標を展開表示:

```css
.rank-detail {
  display: none;
  grid-template-columns: repeat(2, 1fr);
  gap: 4px 16px;
  padding: 8px var(--card-padding);
  background: var(--surface-2);
}

.ranking-row.expanded + .rank-detail {
  display: grid;
}
```

### 4-5. 情報密度を保つデザインのポイント

- **tabular-nums**: 数値は `font-variant-numeric: tabular-nums` で桁位置を揃える
- **右揃え**: 数値列は右揃え（桁の比較がしやすい）
- **ゼブラストライプ不要**: ダークテーマではボーダーで十分（ゼブラの色差が微妙になりすぎる）
- **ホバーフィードバック**: `background-color` のシフトのみ（design-spec の指示通り）
- **ソート状態の視覚化**: ソート中のカラムヘッダーにアクセントカラー + 矢印アイコン

---

## 5. aspect-ratio による CLS 防止

### 5-1. 基本

```css
.image-container {
  aspect-ratio: 3 / 4;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

`aspect-ratio` を設定すると、ブラウザは画像読み込み前に正しい高さを確保する。これにより CLS (Cumulative Layout Shift) が 0 になる。

### 5-2. 本プロジェクトの画像コンテナ

design-spec の立ち絵表示ルールに対応:

```css
/* キャラカード一覧: real.png, 最小150px, 縦長 (2:3〜3:4) */
.char-card-image {
  aspect-ratio: 2 / 3; /* 推奨 */
  min-width: 150px;
  overflow: hidden;
}

/* ランキング行・ミニカード: mini.png, 44px, 円形 */
.rank-avatar {
  width: 44px;
  height: 44px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  object-fit: cover;
}

/* プロフィールヒーロー: real.png, 最小300px, 全身 */
.profile-hero-image {
  aspect-ratio: 2 / 3;
  min-width: 300px;
  max-height: 600px;
  object-fit: contain; /* 全身を見せるので cover ではなく contain */
}

/* 予想カード: mini.png, 48px, 円形 */
.prediction-avatar {
  width: 48px;
  height: 48px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  object-fit: cover;
}
```

### 5-3. モバイルでの立ち絵制限（キャラ詳細）

```css
/* design-spec: 立ち絵の高さは min(50vh, 360px) に制限 */
.profile-hero-image {
  max-height: min(50vh, 360px);
  width: auto;
  aspect-ratio: 2 / 3;
}
```

### 5-4. HTML 属性での明示

CLS 防止のベストプラクティスとして、`<img>` に `width` / `height` 属性を常に付与:

```html
<!-- ブラウザがアスペクト比を計算して事前にスペースを確保 -->
<img src="assets/characters/tatsunosuke/real.png"
     alt="龍之介"
     width="400" height="600"
     loading="lazy">
```

CSS の `aspect-ratio` と HTML の `width`/`height` は併用可能。HTML 属性はフォールバックとして機能する。

### 5-5. ヒーロー背景画像の CLS 対策

```css
.hero {
  min-height: clamp(300px, 50vh, 600px);
  background-image: url(...);
  background-size: cover;
  background-position: center;
}
```

`min-height` を CSS で確保することで、背景画像の読み込みに関わらずレイアウトが安定する。

---

## 6. モバイルボトムタブバー

### 6-1. 基本実装

design-spec: 620px 以下で底部タブバー（固定）、4項目、56〜64px。

```css
.bottom-nav {
  display: none; /* デスクトップでは非表示 */
}

@media (max-width: 620px) {
  .bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    padding-bottom: env(safe-area-inset-bottom);
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: var(--surface);
    border-top: 1px solid var(--border);
    z-index: 100;
  }

  /* main の下マージンを底部バーの高さ分確保 */
  main {
    padding-bottom: calc(56px + env(safe-area-inset-bottom));
  }
}
```

### 6-2. safe-area-inset-bottom の有効化

`<meta name="viewport">` に `viewport-fit=cover` が必要:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

これがないと `env(safe-area-inset-bottom)` は常に `0` を返す。

### 6-3. 現在地のハイライト

```css
.bottom-nav-item[aria-current="page"] {
  color: var(--gold);
}

.bottom-nav-item[aria-current="page"]::after {
  content: '';
  position: absolute;
  bottom: calc(100% - 2px);
  left: 25%;
  right: 25%;
  height: 2px;
  background: var(--gold);
  border-radius: 1px;
}
```

### 6-4. タブレット（620px〜880px）

```css
@media (min-width: 621px) and (max-width: 880px) {
  .header-nav {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    white-space: nowrap;
    scrollbar-width: none;
  }

  .header-nav::-webkit-scrollbar {
    display: none;
  }
}
```

---

## 7. レスポンシブモーダル（ボトムシート）

### 7-1. design-spec の要件

620px 以下でレース詳細モーダルをボトムシートとして表示。

```css
dialog.race-detail {
  border: none;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  color: var(--text);
  max-width: min(640px, 90vw);
  max-height: 85vh;
  overflow-y: auto;
}

@media (max-width: 620px) {
  dialog.race-detail {
    margin: auto 0 0 0;     /* 画面下端に吸着 */
    max-width: 100%;
    max-height: 92vh;
    width: 100%;
    border-radius: 12px 12px 0 0;
    animation: slide-up 250ms ease-out;
  }

  dialog.race-detail::backdrop {
    background: rgba(0, 0, 0, 0.6);
  }
}

@keyframes slide-up {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
```

### 7-2. 背面スクロール抑止

```js
function openModal(dialog) {
  document.body.style.overflow = 'hidden';
  dialog.showModal();
}

function closeModal(dialog) {
  document.body.style.overflow = '';
  dialog.close();
}
```

---

## 8. 既存 CSS との整合性

現在の `site/styles.css` の状態:
- `--max: 1180px` → design-spec の `1200px` に合わせて更新
- サーフェス階層 `--surface` / `--surface-2` / `--surface-3` は design-spec の 4段階（surface-0〜3）に対応済み（`--bg` が surface-0）
- フォント定義済み: `--f-serif`（明朝）, `--f-sans`（ゴシック）, `--f-mono`（等幅）
- ブレイクポイント: 現在未定義 → 620px / 880px を新設
- clamp トークン: 未定義 → `--space-lg` / `--space-md` / `--space-sm` / `--page-padding` / `--card-padding` を追加

---

## 参考リンク

- [Linearly Scale font-size with CSS clamp()](https://css-tricks.com/linearly-scale-font-size-with-css-clamp-based-on-the-viewport/) — clamp 線形補間の公式解説
- [Min-Max-Value Interpolation Calculator](https://min-max-calculator.9elements.com/) — clamp 値の計算ツール
- [CSS Grid full-bleed layout tutorial (Josh W. Comeau)](https://www.joshwcomeau.com/css/full-bleed/) — フルブリードの原典
- [Layout Breakouts with CSS Grid (Ryan Mulligan)](https://ryanmulligan.dev/blog/layout-breakouts/) — 名前付きライン拡張版
- [Auto-Sizing Columns in CSS Grid: auto-fill vs auto-fit (CSS-Tricks)](https://css-tricks.com/auto-sizing-columns-css-grid-auto-fill-vs-auto-fit/) — auto-fit/auto-fill の違い
- [CSS Responsive Tables Complete Guide (DEV Community)](https://dev.to/satyam_gupta_0d1ff2152dcc/css-responsive-tables-complete-guide-with-code-examples-for-2025-225p) — レスポンシブテーブルパターン集
- [How To Fix Cumulative Layout Shift Issues (Smashing Magazine)](https://www.smashingmagazine.com/2021/06/how-to-fix-cumulative-layout-shift-issues/) — CLS 対策の包括ガイド
- [CSS aspect-ratio: Prevent Layout Shifts (Digital Thrive)](https://digitalthriveai.com/en-us/resources/docs/web-development/aspect-ratio/) — aspect-ratio による CLS 防止
- [The Complete Guide to CSS Clamp() in 2025](https://portfolio.gooselabs.ru/en/blog/css-clamp-complete-guide-2025) — clamp() 総合ガイド
- [Responsive Typography Best Practices for 2026](https://remtopx.com/blog/responsive-typography-best-practices/) — 最新のタイポグラフィ実践
- [Safely position fixed content on mobile devices](https://dev.to/believer/safely-position-fixed-content-on-newer-mobile-devices-5c94) — safe-area-inset の実装
- [Card grids with auto-fit/minmax (no media queries)](https://cr0x.net/en/card-grid-auto-fit-minmax/) — メディアクエリなしカードグリッド
