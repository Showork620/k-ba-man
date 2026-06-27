# design-spec 改定計画（re-plan）

design-spec.md（v2）を各 research ファイルと突き合わせ、改定すべき点・追加すべき点・確認された点を集積する。

---

## 処理状況

| # | research ファイル | 状態 |
|---|---|---|
| 1 | research-color-system.md | 完了 |
| 2 | research-typography.md | 完了 |
| 3 | research-mobile-patterns.md | 完了 |
| 4 | research-motion-cards.md | 完了 |
| 5 | research-responsive-layout.md | 完了 |
| 6 | research-accessibility.md | 完了 |
| 7 | research-performance.md | 完了 |
| 8 | research-ogp-sharing.md | 完了 |
| 9 | research-ranking-drama.md | 完了 |
| 10 | research-character-ui.md | 完了 |
| 11 | research-css-architecture.md | 完了 |
| 12 | research-hero-landing.md | 完了 |
| 13 | research-phase-ui.md | 完了 |
| 14 | research-icons-brand.md | 完了 |

---

## 1. カラーシステム（← research-color-system.md）

対応 design-spec セクション: §4-2

### 確認済み（現行 spec のまま維持）

- ダークテーマ基調の方針は正しい。現行背景 `#0b0c11 ≒ oklch(0.11, 0.01, 270)` はすでに「純黒でない暗色」要件を満たしている
- surface 4段階（0→1→2→3）の概念は正しい。現行実装の明度ステップも妥当
- `color-mix()` でキャラカラーの dim/mid/vivid を生成する方針は、ブラウザ互換性を含め問題なし（Baseline Widely Available）
- セマンティックカラー（的中/3着内/外れ/上昇/下降）の色系統選定は妥当

### 要改定: キャラカラーの色相渋滞

**現行 spec の問題**: §4-2 で「10人並べたとき全員違う色が一目で分かること」と要求しているが、現行の10色定義には色相の渋滞がある。

| 渋滞ゾーン | キャラ | 色相 | 問題 |
|---|---|---|---|
| 緑系 | 健太 145° / 優子 160° | 差 15° | 小さい画像で区別困難 |
| 暖色系 | 鉄平 40° / 陽菜 25° / 吾郎 35° | 3色が 15° 幅に密集 | 一覧で見分けがつかない |
| 赤系 | 龍之介 0° / さくら 345° | 差 15° | 赤のバリエーション |

**改定案**: spec にキャラカラーの oklch 値を10人分明記し、最低色相差 30° を設計基準に追加する。具体的には:
- 健太を黄緑方向（H:125°）にシフト
- 吾郎をオリーブ〜カーキ方向（H:100°前後）にシフト
- 龍之介とさくらの赤系は明度・彩度で差をつける

### 要追加: セマンティックカラーとキャラカラーの干渉回避ルール

**現行 spec の欠落**: セマンティックカラー5種がキャラカラーと同系色で衝突するリスクへの対処が未記載。

**追加すべき内容**:
1. **3層トークンの明文化**: Primitive → Semantic → Component の階層。用途・明度・形状の3軸で分離
2. **明度帯の棲み分け**: セマンティックカラー L:0.65〜0.80 / キャラカラー L:0.40〜0.55
3. **形状ルール**: ステータス = pill 型バッジ、キャラ所属 = 円形バッジ。形が違えば色が近くても誤読しない

### 要追加: oklch の技術制約

**現行 spec の欠落**: `oklch()` は CSS custom property で個別チャネル（L, C, H）の `var()` 差し込みに非対応。ページ別の背景色温度変更は「概念的にはできるが、各ページに完全な oklch() 値を書く or JS で注入する」制約がある。

**追加すべき内容**: §6 技術制約に oklch の var() 制限を注記

### 要追加: color-mix() の色空間統一

**追加すべき内容**: 全ての `color-mix()` 呼び出しで `in oklch` を色空間として統一する設計基準。sRGB 混合との混在を禁止。

---

## 2. タイポグラフィ（← research-typography.md）

対応 design-spec セクション: §4-3

### 確認済み（現行 spec のまま維持）

- Perfect Fourth（1.333）スケールの採用方針は正しい
- `--type-base: 16px` を基準とする設計は妥当
- Google Fonts（Noto Sans JP + Source Serif 4）の組み合わせ方針は維持

### 要改定: `--muted` カラーのコントラスト不足

**現行 spec の問題**: `--muted: #62647a`（`oklch(0.43 0.04 270)`付近）はダーク背景に対してコントラスト比 **3.1:1** しかなく、WCAG AA 基準（4.5:1）を満たさない。

**改定案**: `--muted` を `oklch(0.55 0.04 270)`（≈ `#7a7c92`）程度に明るくする。測定値: 背景 `oklch(0.11)` に対して ≒4.6:1（AA クリア）。

### 要追加: タイプスケールの完全定義

現行 spec にトークン名と値の対応が未記載。以下を §4-3 に追加:

```css
/* デスクトップ: Perfect Fourth (1.333) */
--type-xs:   12.0px   /* 0.75rem */
--type-sm:   14.4px   /* 0.9rem  */
--type-base: 16.0px   /* 1rem    */
--type-md:   21.3px   /* 1.333rem */
--type-lg:   28.4px   /* 1.777rem */
--type-xl:   37.9px   /* 2.369rem */
--type-2xl:  50.5px   /* 3.157rem */

/* モバイル: Major Third (1.25) — @media (max-width: 620px) で --type-scale を 1.25 に切替 */
```

### 要追加: letter-spacing 体系

```css
--ls-body:    0.02em   /* 本文・UI テキスト */
--ls-heading: 0.04em   /* 見出し */
--ls-label:   0.06em   /* ラベル・キャプション・ALL CAPS 要素 */
```

### 要追加: フォントレンダリング設定（P0）

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

現行実装に未指定。Retina ディスプレイでのフォント品質に直結するため P0 対応。

### 要追加: CLS 対策フォールバックメトリクス

```css
@font-face {
  font-family: 'Noto Sans JP Fallback';
  src: local('Hiragino Sans'), local('Meiryo');
  ascent-override: 105%;
  descent-override: 25%;
  line-gap-override: 0%;
  size-adjust: 102%;
}
```

Web フォント読み込み前後のレイアウトシフト（CLS）を最小化する。

---

## 3. モバイル UI パターン（← research-mobile-patterns.md）

対応 design-spec セクション: §4-6（モバイル対応）

### 確認済み（現行 spec のまま維持）

- ダークテーマでの底部ナビゲーションバーの採用方針は正しい
- `<dialog>` + `showModal()` でボトムシートを実装する方針は維持

### 要改定: `viewport-fit=cover` の必須化

**現行 spec の欠落**: safe-area 対応が spec に記載されているが、`viewport-fit=cover` なしでは `env(safe-area-inset-bottom)` が常に 0 を返すという前提条件が未明記。

**改定案**: `<meta name="viewport">` タグの必須値として以下を spec に記載する:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

### 要追加: 底部タブバーの正確な高さ定義

```css
.nav-bottom {
  height: calc(60px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

コンテンツエリアにも同等のパディングを追加して被りを防ぐ:

```css
.page-content {
  padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px) + 1rem);
}
```

### 要追加: ボトムシートの高さ上限

- モバイル（`max-width: 620px`）: `max-height: 92dvh`
- デスクトップ: `max-height: 85dvh`（モーダルとして表示）

背後スクロール抑止: `overscroll-behavior: contain` をシート自身に設定。

### 要追加: `@starting-style` の互換性注記

閉じアニメーションに `@starting-style` を使う実装例が research に掲載されているが、**Safari は 2026年6月時点で未対応**。当面は開くアニメーションのみ実装し、閉じは即時非表示とする。

### 要追加: アニメーション時間のカスタムプロパティ一元管理

```css
:root {
  --duration-fast:   150ms;
  --duration-medium: 300ms;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast:   0.01ms;
    --duration-medium: 0.01ms;
  }
}
```

`0ms` ではなく `0.01ms` を使うこと（`0ms` は `transitionend` イベントが発火しない実装がある）。

---

## 4. モーション・カード UI（← research-motion-cards.md）

対応 design-spec セクション: §4-5（モーション）、§4-4（カード）

### 確認済み（現行 spec のまま維持）

- Stagger アニメーションの基本方針（CSS カスタムプロパティ `--stagger-index`）は正しい
- `prefers-reduced-motion` 対応の必要性は確認済み

### 要改定: `color-mix()` の色空間統一

**現行実装の問題**: CSS 内に `color-mix(in srgb, ...)` と `color-mix(in oklch, ...)` が混在している。知覚的均一性が異なる色空間で混合すると、予期しない色補間が生じる。

**改定**: 全ての `color-mix()` を `in oklch` に統一。sRGB 混合は禁止とする。

### 要追加: `will-change` の適切な使用

ホバーリフトするカードに `will-change: transform` を設定してコンポジットレイヤーに昇格:

```css
.character-card {
  will-change: transform;
}
```

大量カードへの一括適用は避け、ホバー時のみ付与する場合は JS での動的設定も可。

### 要追加: View Transitions API の互換性と実装方針

- Baseline 2025: Chrome 111+, Firefox 133+, Safari 18+（広くサポート済み）
- SPA での使い方: `document.startViewTransition(() => { /* DOM 更新 */ })`
- ページ単位のアニメーション: `view-transition-name: page` を `<main>` に設定
- キャラカード → 詳細ページ: `view-transition-name: char-<id>` で画像をシームレスに遷移
- フォールバック: API 非対応ブラウザは即時切り替え（graceful degradation、エラーなし）

### 要追加: Stagger の具体的な実装仕様

k-ba-man のキャラカード一覧は10枚固定なので CSS `nth-child` で十分:

```css
.character-card:nth-child(1)  { --stagger-index: 0; }
.character-card:nth-child(2)  { --stagger-index: 1; }
/* ... */
.character-card:nth-child(10) { --stagger-index: 9; }

.character-card {
  animation-delay: calc(var(--stagger-index) * 30ms);
}
```

動的リストには JS で `el.style.setProperty('--stagger-index', i)` を設定する。

---

## 5. レスポンシブレイアウト（← research-responsive-layout.md）

対応 design-spec セクション: §4-6（レスポンシブ）

### 確認済み（現行 spec のまま維持）

- モバイルファーストのアプローチは正しい
- グリッドベースのレイアウトシステムの採用は妥当

### 要改定: `--max` 幅の修正

**現行 spec**: `--max: 1180px`

**改定**: `--max: 1200px`（より標準的な値で、計算の切れが良い）

### 要改定: ブレイクポイントの明確化

現行 spec のブレイクポイントが曖昧。以下に確定:

| 名前 | 値 | 境界 |
|---|---|---|
| `--bp-sm` | 620px | モバイル / タブレット |
| `--bp-md` | 880px | タブレット / デスクトップ |

### 要追加: `clamp()` による流動的余白トークン

```css
/* ページ横パディング */
--page-px: clamp(1rem, 0.7rem + 1.5vw, 2.5rem);

/* セクション間スペーシング */
--space-section: clamp(3rem, 2.4rem + 3vw, 6rem);

/* ブロック間スペーシング */
--space-block: clamp(1.5rem, 1.3rem + 1vw, 2.5rem);
```

### 要追加: ランキングテーブルのアクセシブルな div 実装

`<table>` ではなく `<div>` ベースで構築する場合（モバイル対応の柔軟性のため）:

```html
<div role="table" aria-label="順位表">
  <div role="rowgroup">
    <div role="row">
      <div role="columnheader" aria-sort="descending">ポイント</div>
    </div>
  </div>
  <div role="rowgroup">
    <div role="row">
      <div role="cell">1</div>
    </div>
  </div>
</div>
```

モバイルでは `rank-active-stat`（選択中の統計項目）のみ表示し、他の列は `display: none` で非表示にする。

---

## 6. アクセシビリティ（← research-accessibility.md）

対応 design-spec セクション: §5（アクセシビリティ）

### 確認済み（現行 spec のまま維持）

- WCAG AA（4.5:1）コントラスト基準の採用は正しい
- `prefers-reduced-motion` 対応の必要性は確認済み
- スキップリンク `<a class="skip-link" href="#app">` + `tabindex="-1"` の実装は正しい

### 要追加: SPA ルート変更時のフォーカス管理

ハッシュルーティングでページ遷移する際、フォーカスが前ページの要素に残る問題を解消:

```js
function navigateTo(hash) {
  // ... DOM 更新 ...
  const main = document.querySelector('main');
  main.setAttribute('tabindex', '-1');
  main.focus();
  routeAnnouncer.textContent = document.title; // aria-live="polite"
}
```

`<div id="route-announcer" aria-live="polite" aria-atomic="true" class="sr-only">` を body に追加する。

### 要追加: `aria-sort` の正しい使い方

```html
<!-- ソート中の列のみ aria-sort を設定 -->
<div role="columnheader" aria-sort="descending">ポイント</div>
<!-- 他の列は aria-sort 属性を完全に除去（"none" ではなく） -->
<div role="columnheader">予想数</div>
```

`aria-sort="none"` は「ソート可能だがソートされていない」を意味するため、一覧ページで全列に設定すると冗長なアナウンスが発生する。

### 要追加: キャラクター立ち絵の alt テキスト設計

| 文脈 | alt テキスト |
|---|---|
| 名前が隣接テキストに存在する | `alt=""` （装飾扱い） |
| 立ち絵が単独で識別子として機能する | `alt="[名前] — [外見の簡潔な描写]"` |
| ランキングカードのサムネイル | `alt=""` （カード全体の見出しが名前を含むため） |

---

## 7. パフォーマンス（← research-performance.md）

対応 design-spec セクション: §6（技術制約・パフォーマンス）

### 確認済み（現行 spec のまま維持）

- Core Web Vitals（LCP/CLS/INP）を意識した実装方針は正しい
- `aspect-ratio` による CLS 防止の方針は維持

### 要改定: mini.png のサイズ問題（P0）

**現行の問題**: キャラ立ち絵 `mini.png` が **460〜613KB/枚**。10枚で約 5MB。初回表示が致命的に遅い。

**改定案**: ビルドスクリプトで WebP 変換 + リサイズを追加:

```
assets/characters/<id>/mini.png → mini.webp (400px幅, 品質80)
```

目標: **30KB 以下/枚**（≒ 1/20 に圧縮）。`<picture>` 要素で WebP 優先 + PNG フォールバック。

### 要追加: スクリプトの `defer` 必須化（P0）

現行: `<script src="...">` で同期読み込み → HTML パースがブロックされる。

```html
<!-- 改定後 -->
<script src="app.js" defer></script>
```

すべての外部スクリプトに `defer` を追加（または `type="module"` に変更、モジュールは暗黙的に defer）。

### 要追加: Critical CSS のインライン化方針

LCP 改善のため、ファーストビュー描画に必要な CSS のみを `<style>` タグにインライン化:

- 対象: CSS トークン変数 + リセット + ヘッダー + ヒーロー（目標 ≤ 3KB）
- 残りは `<link rel="stylesheet">` で非同期読み込み

### 要追加: LCP 画像の優先度制御

```html
<!-- ファーストビューのヒーロー画像（LCP 候補） -->
<img src="hero.webp" loading="eager" fetchpriority="high" alt="...">

<!-- スクロール下の画像 -->
<img src="card.webp" loading="lazy" alt="...">
```

### 要追加: DOM 操作のバッチ化

カード一覧の動的生成時は `DocumentFragment` を使って一括追加:

```js
const frag = document.createDocumentFragment();
characters.forEach(c => frag.appendChild(createCard(c)));
container.appendChild(frag); // リフロー1回
```

---

## 8. OGP・シェアリング（← research-ogp-sharing.md）

対応 design-spec セクション: §6（技術制約）

### 確認済み（現行 spec のまま維持）

- ハッシュルーティング SPA でクローラが `#` 以降を認識しない制約は spec に記載済み

### 要改定: OGP タグの即時追加（P0）

**現行の問題**: `index.html` に OGP タグが一切ない。SNS シェア時にサムネイルが表示されない。

**追加すべき最低限のタグ**:

```html
<meta property="og:type" content="website">
<meta property="og:title" content="K-ba-man — AIによる競馬予想円卓会議">
<meta property="og:description" content="10人のAI予想専門家が毎週の重賞を予想し、順位を競う。">
<meta property="og:image" content="https://example.com/ogp.png">
<meta property="og:url" content="https://example.com/">
<meta name="twitter:card" content="summary_large_image">
```

### 要追加: OGP 画像の仕様

- サイズ: **1200 × 630px**（標準的な横長比率）
- URL: 絶対 URL 必須（相対 URL 不可）
- LINE 対応: 画像の**中央 630 × 630px**が正方形クロップされる前提でデザイン
- ファイル形式: PNG または JPEG（WebP は一部プラットフォームで非対応）

### 要追加: favicon の3ファイル構成（P0）

現在 favicon が未設定。以下の3ファイルを追加:

| ファイル | 用途 |
|---|---|
| `favicon.svg` | モダンブラウザ（ダークモード対応可） |
| `favicon.ico` | 32px、IE・旧ブラウザのフォールバック |
| `apple-touch-icon.png` | 180px、iOS ホーム画面追加 |

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### 要追加: 将来ロードマップ（静的 OGP 画像のキャラ別対応）

ハッシュルーティングの制約上、キャラ別 OGP を動的生成するには別途静的ファイルが必要:

```
/share/characters/<id>.html  ← キャラ別 OGP 設定 + リダイレクト
```

Node.js ビルドスクリプトで 10 キャラ分を生成する（将来フェーズ）。

---

## 9. ランキング・ドラマ UI（← research-ranking-drama.md）

対応 design-spec セクション: §4-4（ランキング）

### 確認済み（現行 spec のまま維持）

- 順位変動を視覚化する方針（上昇/下降インジケーター）は正しい
- ソートによるインタラクティブ性の必要性は確認済み

### 要追加: 降格圏の段階的強調表現

下位キャラに「プレッシャー」を視覚的に伝える CSS:

```css
--danger-glow: oklch(0.55 0.18 25);  /* 緊張の赤系グロー */

/* 降格危険圏: 3段階で強度変化 */
.rank-row[data-rank="10"] { box-shadow: inset 4px 0 0 oklch(0.55 0.18 25 / 0.8); }
.rank-row[data-rank="9"]  { box-shadow: inset 4px 0 0 oklch(0.55 0.18 25 / 0.5); }
.rank-row[data-rank="8"]  { box-shadow: inset 4px 0 0 oklch(0.55 0.18 25 / 0.25); }
```

### 要追加: ソート UI のハイブリッド設計

| 端末 | UI | 実装 |
|---|---|---|
| デスクトップ | カラムヘッダークリック | `aria-sort` 属性の切り替え |
| モバイル | ドロップダウン選択 | `<select>` → JS でソート実行 |

### 要追加: FLIP テクニックによるソートアニメーション

```js
// First: 現在位置を記録
const first = el.getBoundingClientRect();
// Last: DOM 並び替え後の位置を記録
reorderDOM();
const last = el.getBoundingClientRect();
// Invert: 逆変換を適用
const dy = first.top - last.top;
el.style.transform = `translateY(${dy}px)`;
// Play: アニメーションで元に戻す
requestAnimationFrame(() => {
  el.style.transition = 'transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  el.style.transform = '';
});
```

### 要追加: 対立マーカー（予想の差異可視化）

```css
/* 多数派と異なる予想をしたキャラのマーカー */
.prediction-contrarian {
  background: oklch(0.5 0.08 270 / 0.15);
  border: 1px solid oklch(0.5 0.08 270 / 0.4);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: var(--type-xs);
}
```

### 要追加: 成績ステータスピルのスタイル

```css
.pill-hit    { background: oklch(0.65 0.15 75 / 0.15);  border: 1px solid oklch(0.65 0.15 75 / 0.6);  } /* 的中: gold */
.pill-place  { background: oklch(0.5 0.08 270 / 0.15);  border: 1px solid oklch(0.5 0.08 270 / 0.4);  } /* 3着内: 藍 */
.pill-miss   { background: oklch(0.55 0.18 25 / 0.12);  border: 1px solid oklch(0.55 0.18 25 / 0.4);  } /* 外れ: 赤 */
```

---

## 10. キャラクター UI（← research-character-ui.md）

対応 design-spec セクション: §4-4（キャラクター表示）

### 確認済み（現行 spec のまま維持）

- キャラクター立ち絵を中心に据えるデザイン方針は正しい
- 各キャラ固有カラーをアクセントとして使う方針は維持

### 要改定: キャラ画像の影は `drop-shadow()` で

**現行の問題**: `box-shadow` を使うと透過 PNG の矩形境界に影がついてしまう。

**改定**: キャラ立ち絵には必ず `filter: drop-shadow()` を使用:

```css
.character-img {
  filter: drop-shadow(0 8px 24px oklch(0 0 0 / 0.5));
}
```

### 要追加: `object-position` のコンテキスト別指定

| 文脈 | `object-position` |
|---|---|
| カード一覧（顔・上半身重視） | `center 25%` |
| プロフィール詳細（全身表示） | `center bottom` |

### 要追加: 和紙テクスチャの実装仕様

```html
<svg class="paper-texture" aria-hidden="true">
  <filter id="noise">
    <feTurbulence type="fractalNoise" baseFrequency="0.65"
                  numOctaves="4" stitchTiles="stitch"/>
    <feColorMatrix type="saturate" values="0"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#noise)"
        opacity="0.03" style="mix-blend-mode: overlay"/>
</svg>
```

**注意**: 大きな領域（画面全体など）への `feTurbulence` 適用はレンダリングコストが高い。ヒーローセクションに限定し、スクロール下には使わない。

### 要追加: ページ別背景ビジュアル

| ページ | 背景ビジュアル |
|---|---|
| Overview（トップ） | キャラ全員集合ビジュアル |
| キャラ詳細 | 「円卓の間」イメージ |
| 成績・ランキング | 「監査室」イメージ |
| 予想ページ | 「トラック朝焼け」イメージ |

### 要追加: `clip-path` の使用制限

斜め切り込み（`clip-path: polygon()`）は「使いすぎ注意」。ヒーロー画像の装飾的な斜め切りは1〜2箇所に留め、カード全体には適用しない。

---

## 11. CSS アーキテクチャ（← research-css-architecture.md）

対応 design-spec セクション: §6（技術制約）

### 確認済み（現行 spec のまま維持）

- `[style*="--accent"]` でのキャラカラー注入方式は現行のまま継続
- CSS Cascade Layers（`@layer`）は現時点では不採用（複雑性とメリットが釣り合わない）
- CUBE CSS に近いクラス命名方針は維持

### 要改定: surface トークンの番号統一

**現行の問題**: `--surface`（無番号）と `--surface-0`〜`--surface-3` が混在している。

**改定**: 全て番号付きに統一し、最暗背景を `--surface-0` として明確化:

```css
--surface-0: oklch(0.08 0.01 270);  /* 最暗: ページ全体背景 */
--surface-1: oklch(0.12 0.01 270);  /* カード背景 */
--surface-2: oklch(0.16 0.01 270);  /* 入力フィールド・セカンダリ */
--surface-3: oklch(0.20 0.01 270);  /* ホバー状態・強調 */
```

既存コードの `--surface`（無番号）参照を `--surface-1` に置換する。

### 要追加: CSS ファイルのセクション構成

CSS ファイルを以下の7セクションで管理:

```
/* 1. TOKENS       — カスタムプロパティ定義 */
/* 2. RESET        — ブラウザデフォルト正規化 */
/* 3. TYPOGRAPHY   — フォント・スケール・行間 */
/* 4. BRAND        — キャラカラー・セマンティックカラー */
/* 5. LAYOUT       — グリッド・コンテナ・余白 */
/* 6. COMPONENTS   — 再利用可能なコンポーネント */
/* 7. PAGE-SPECIFIC — ページ固有スタイル */
```

### 要追加: 命名規則の明確化

- 状態クラス: `is-` プレフィックス（`is-active`, `is-loading`, `is-current`）
- JS フック: `data-*` 属性（`data-char-id`, `data-phase`, `data-rank`）
- コンポーネント: BEM ライクだが厳格には適用しない（`.card__title` は OK、深いネストは避ける）

---

## 12. ヒーロー・ランディング（← research-hero-landing.md）

対応 design-spec セクション: §4-4（ヒーローセクション）

### 確認済み（現行 spec のまま維持）

- ダークヒーローセクションでキャラを際立たせる方針は正しい
- グラデーションオーバーレイによる可読性確保は維持

### 要追加: ヒーロー高さの階層定義

| バリエーション | 高さ指定 | 用途 |
|---|---|---|
| フル | `min-height: min(620px, calc(100dvh - 68px))` | トップページ |
| プロフィール | `min-height: min(480px, 60dvh)` | キャラ詳細 |
| コンパクト | `height: auto` | サブページヘッダー |

`dvh` を `min-height` に使う（最小高さなのでモバイル URL バー収縮によるレイアウトシフトリスクが低い）。

### 要追加: CTA ボタンの3段階定義

```css
/* Primary: gold 塗り + 暗色テキスト */
.btn-primary {
  background: var(--c-gold);
  color: oklch(0.15 0.01 270);
}

/* Secondary: ゴーストボタン */
.btn-secondary {
  background: transparent;
  border: 1px solid oklch(1 0 0 / 0.3);
  color: oklch(0.9 0 0);
}

/* Tertiary: テキストリンク + 下線 */
.btn-tertiary {
  text-decoration: underline;
  text-underline-offset: 3px;
}
```

### 要追加: グラデーションオーバーレイの変数化

```css
/* ハードコードの rgba() → oklch 変数化 */
.hero-overlay {
  background: linear-gradient(
    to bottom,
    oklch(0 0 0 / 0) 0%,
    oklch(0 0 0 / 0.5) 50%,
    var(--surface-0) 100%
  );
}
```

### 要追加: View Transitions でのヒーロー要素遷移

```css
.hero-image {
  view-transition-name: hero-main;
}
```

キャラ一覧 → 詳細ページへの遷移時に、ヒーロー画像がシームレスに拡大する効果が得られる。

---

## 13. フェーズ UI（← research-phase-ui.md）

対応 design-spec セクション: §4-4（フェーズ表示）

### 確認済み（現行 spec のまま維持）

- 予想フェーズ（予想受付中/集計中/結果発表）の3段階表示の方針は正しい
- View Transitions API によるフェーズコンテンツの切り替えアニメーションは維持

### 要改定: ステッパーの再構築（アクセシビリティ）

**現行実装の問題**:
- `aria-current` が未設定
- 完了済み / 現在 / 未到達の視覚的区別がない

**改定後の HTML**:

```html
<ol class="phase-stepper" role="list">
  <li class="phase-step is-completed">
    <span class="step-label">予想受付</span>
  </li>
  <li class="phase-step is-current" aria-current="step">
    <span class="step-label">集計中</span>
  </li>
  <li class="phase-step is-pending">
    <span class="step-label">結果発表</span>
  </li>
</ol>
```

### 要追加: コネクタラインの実装方式（疑似要素方式を採用）

```css
.phase-step + .phase-step::before {
  content: '';
  position: absolute;
  left: -50%;
  top: 50%;
  width: 100%;
  height: 1px;
  background: var(--step-connector-color);
}
```

### 要追加: モバイルでのセグメンテッドコントロール

モバイル（`max-width: 620px`）ではステッパーをセグメンテッドコントロールに変換:

```html
<div class="phase-tabs" role="tablist">
  <button role="tab" data-active="true">予想受付</button>
  <button role="tab">集計中</button>
  <button role="tab">結果発表</button>
  <div class="phase-tabs-slider"></div>
</div>
```

スライダーの位置は `data-active` 属性で制御し、CSS Custom Property で x 位置を計算する。

### 要追加: 静的 SPA の誠実な表示原則

- **禁止**: リアルタイムカウントダウン（更新されないため「嘘」になる）
- **禁止**: 「更新中...」のような自動更新を示唆する表示
- **許可**: 静的な「現在: 集計中」テキスト + 最終更新日時の表示
- **許可**: 手動更新ボタン（ページをリロードする）

---

## 14. アイコン・ブランド（← research-icons-brand.md）

対応 design-spec セクション: §4-2（ブランド要素）

### 確認済み（現行 spec のまま維持）

- ダークテーマに合わせた細身のストロークベースアイコンの方針は正しい
- `currentColor` で着色する方針は維持

### 要追加: SVG スプライトシートの実装

```html
<!-- body 直下（非表示） -->
<svg style="display:none" xmlns="http://www.w3.org/2000/svg">
  <symbol id="icon-crown"    viewBox="0 0 24 24"><!-- path --></symbol>
  <symbol id="icon-trophy"   viewBox="0 0 24 24"><!-- path --></symbol>
  <symbol id="icon-chart"    viewBox="0 0 24 24"><!-- path --></symbol>
  <symbol id="icon-horse"    viewBox="0 0 24 24"><!-- path --></symbol>
  <symbol id="icon-arrow-up" viewBox="0 0 24 24"><!-- path --></symbol>
  <!-- ... 計10種 -->
</svg>

<!-- 使用方法 -->
<svg class="icon" aria-hidden="true" width="20" height="20">
  <use href="#icon-crown"/>
</svg>
```

### 要追加: アイコンのサイズと仕様

| サイズ | 用途 |
|---|---|
| 16px | インラインテキスト内 |
| 20px | カード・ナビゲーション |
| 24px | 詳細ページ・ヘッダー |

- `viewBox`: 全アイコン `0 0 24 24` で統一
- ストローク幅: `1.5px`
- コーナー半径: `stroke-linecap="round"`, `stroke-linejoin="round"`
- 塗りなし・ストロークのみ（フィルアイコンは避ける）

### 要追加: ゲートストライプカラーの変数化

各キャラ所属ゲートの色を CSS 変数で管理（ハードコーディング禁止）:

```css
:root {
  --c-gate-1: oklch(0.7 0.2 25);   /* 赤 */
  --c-gate-2: oklch(0.7 0.18 55);  /* 黒（ダーク調に） */
  --c-gate-3: oklch(0.7 0.15 200); /* 青 */
  /* ... 全ゲート分 */
}
```

### 要追加: ロゴの SVG 化

現行ロゴ「K」がフォント依存の可能性あり。SVG パスに変換してフォントロード前でも正確に表示されるようにする（フォント読み込み失敗時の文字化け防止）。
