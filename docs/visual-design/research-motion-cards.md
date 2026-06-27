# モーション・カードUI・サーフェス階層 デザイン知見集

design-spec.md §4-2（サーフェスとデプス）、§4-5（インタラクション・モーション）の実現に必要な技術知識をまとめる。

---

## 1. サーフェス階層システム（surface-0〜3）

### 1-1. ダークテーマでの深度表現の原則

ダークテーマでは**影（box-shadow）が背景に溶けて見えない**ため、Material Design 3 が採用する**輝度階層（luminance hierarchy）**が標準手法になっている。surface が上位に浮くほど**明るくなる**。影はあくまで補助であり、主たる深度指標は背景色の明度差。

- 各 surface の明度を 5〜8% ずつステップアップさせる
- 純黒 `#000` は避け、微かに色味を帯びた暗色を base にする（spec §4-2 と一致）
- surface-0（最奥）→ surface-3（最前面カード）の 4 段階は Material Design の推奨と合致

### 1-2. CSS カスタムプロパティによる実装

```css
:root {
  /* --- surface 階層 -------------------------------------------------- */
  --surface-0: oklch(0.13 0.01 260);   /* 最奥の背景 */
  --surface-1: oklch(0.17 0.01 260);   /* セクション背景 */
  --surface-2: oklch(0.21 0.012 260);  /* カード */
  --surface-3: oklch(0.26 0.014 260);  /* カード上のカード / ポップオーバー */

  /* --- 影（補助） ---------------------------------------------------- */
  --shadow-1: 0 1px 3px oklch(0 0 0 / 0.4);
  --shadow-2: 0 4px 12px oklch(0 0 0 / 0.5);
  --shadow-3: 0 8px 24px oklch(0 0 0 / 0.6);
}
```

**ポイント**: OKLCH 色空間を使うと、明度（L チャンネル）だけを段階的に上げれば色相・彩度が崩れない。2025 年時点で全主要ブラウザが OKLCH をサポート済み。

### 1-3. カード上のカード（ネスト）の破綻防止

- **surface レベルを CSS カスタムプロパティで伝播**させる。カードコンポーネントが自身の surface を子に `--current-surface` として渡し、子はそれを参照して 1 段上の surface を使う
- surface-3 を超えるネストが発生しないよう、情報設計で 4 段階以内に収める（spec と一致）
- ボーダー（1px の微細な明度差）を併用すると、背景色の差が小さくても輪郭が認識できる

```css
.card {
  background: var(--surface-2);
  border: 1px solid oklch(1 0 0 / 0.06);
  box-shadow: var(--shadow-1);
}
.card .card-inner {
  background: var(--surface-3);
  border: 1px solid oklch(1 0 0 / 0.08);
}
```

### 1-4. 影（box-shadow）vs ボーダー vs backdrop-filter

| 手法 | ダークテーマでの効果 | パフォーマンス | 推奨用途 |
|---|---|---|---|
| box-shadow | 背景が暗いと見えにくい。色付き影（要素色の暗い飽和版）なら読める | 良好（GPU 合成） | 補助的な深度ヒント |
| border | 薄い白系（`oklch(1 0 0 / 0.06)`）で輪郭を出す。最もコスト低 | 最良 | カード・パネルの境界 |
| backdrop-filter | ガラス効果。背景の複雑さに依存、overdraw コスト高 | やや重い | 本 spec では不採用（避けるべきもの：過剰なグラデーション系） |

**結論**: ダークテーマでは「輝度差 + 薄いボーダー」が主、box-shadow が補助。backdrop-filter は世界観（和紙・金属のヘアライン）に合わないため不使用。

---

## 2. カードのホバー・フォーカスフィードバック

### 2-1. リフト + ボーダー変化の実装

spec 要件: `translateY(-2〜-4px)` のリフト + ボーダーカラー変化、150ms ease。

```css
.card {
  transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
  border: 1px solid oklch(1 0 0 / 0.06);
  will-change: transform; /* リフトをGPU合成に乗せる */
}

/* デスクトップ（ホバーデバイス）のみ */
@media (hover: hover) {
  .card:hover {
    transform: translateY(-3px);
    border-color: var(--char-color-mid);          /* キャラ固有カラー 25% */
    box-shadow: 0 6px 16px oklch(0 0 0 / 0.5);
  }
}

/* タッチデバイスでは :active で代替 */
@media (hover: none) {
  .card:active {
    transform: translateY(-1px);
    border-color: var(--char-color-mid);
  }
}
```

### 2-2. @media (hover: hover) の活用

- `@media (hover: hover)` はマウス等のプライマリ入力がホバーをサポートするデバイスにのみ適用
- タッチデバイスでは `:hover` がタップ後にスティッキーに残る問題があるため、`(hover: none)` で `:active` に切り替えるのがベストプラクティス
- `(pointer: fine)` と組み合わせると、スタイラス対応タブレットなども適切にハンドリングできる

### 2-3. :focus-visible のベストプラクティス

```css
.card:focus-visible {
  outline: 2px solid var(--char-color-vivid);    /* キャラ固有カラー 100% */
  outline-offset: 2px;
  border-color: var(--char-color-mid);
}

/* :focus（マウスクリック含む）では outline を消さない */
/* ブラウザが :focus-visible を判定し、キーボード操作時のみ outline を表示 */
```

- `:focus-visible` は全主要ブラウザでサポート済み
- `outline-offset` で要素の境界から離すと、ボーダーと干渉しない
- アウトライン色にキャラカラーの vivid（100%）を使うと、ブランドと一体感が出る

### 2-4. ランキング行のフィードバック

spec 要件: 背景色のシフトのみ（表は静的に見えるべき）。

```css
@media (hover: hover) {
  .ranking-row:hover {
    background: var(--surface-2);  /* surface-1 → surface-2 へシフト */
  }
}
```

---

## 3. Stagger アニメーション

### 3-1. spec 要件の確認

- カード一覧が順に現れる演出: `0.03s × index`、合計 `0.3s` 以内
- 10 枚のカードなら `0.03s × 9 = 0.27s`（最後のカードの遅延） + アニメーション自体の尺 → 合計 0.3s 以内に収まる

### 3-2. CSS のみの実装（nth-child）

```css
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.card-grid .card {
  opacity: 0;
  animation: card-enter 200ms ease-out forwards;
}

.card-grid .card:nth-child(1)  { animation-delay: 0ms; }
.card-grid .card:nth-child(2)  { animation-delay: 30ms; }
.card-grid .card:nth-child(3)  { animation-delay: 60ms; }
.card-grid .card:nth-child(4)  { animation-delay: 90ms; }
.card-grid .card:nth-child(5)  { animation-delay: 120ms; }
.card-grid .card:nth-child(6)  { animation-delay: 150ms; }
.card-grid .card:nth-child(7)  { animation-delay: 180ms; }
.card-grid .card:nth-child(8)  { animation-delay: 210ms; }
.card-grid .card:nth-child(9)  { animation-delay: 240ms; }
.card-grid .card:nth-child(10) { animation-delay: 270ms; }
```

**CSS カスタムプロパティ版**（より柔軟）:

```css
.card-grid .card {
  --stagger-index: 0;
  opacity: 0;
  animation: card-enter 200ms ease-out forwards;
  animation-delay: calc(var(--stagger-index) * 30ms);
}
```

HTML 側で `style="--stagger-index: 0"` 〜 `style="--stagger-index: 9"` を付与。JS でカードを生成する際に自然に設定できる。

### 3-3. JS 制御（IntersectionObserver 連携）

スクロールで画面内に入ったタイミングで発火させる場合:

```js
function setupStagger(containerSelector) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const cards = entry.target.querySelectorAll('.card');
      cards.forEach((card, i) => {
        card.style.setProperty('--stagger-index', i);
        card.classList.add('is-visible');
      });
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1 });

  document.querySelectorAll(containerSelector).forEach(el => observer.observe(el));
}
```

```css
.card-grid .card {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
  transition-delay: calc(var(--stagger-index, 0) * 30ms);
}
.card-grid .card.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

### 3-4. CSS-only vs JS: 判断基準

| 観点 | CSS nth-child | CSS カスタムプロパティ | JS + IntersectionObserver |
|---|---|---|---|
| 要素数が固定（10人） | **最適** | 良い | オーバーキル |
| スクロール連動が必要 | 不可 | 不可 | **必須** |
| 動的に増減する | 壊れやすい | JS でセット可 | **最適** |

**k-ba-man の場合**: キャラカードは 10 枚固定 → CSS nth-child で十分。ページ遷移時に毎回発火させるため、IntersectionObserver よりもページレンダリング時にクラスを付与する方がシンプル。

---

## 4. ページ遷移のフェードイン

### 4-1. View Transitions API（推奨）

2025 年 10 月に Baseline Newly Available 到達（Chrome 111+, Edge 111+, Firefox 133+, Safari 18+）。vanilla JS の SPA に最適。

```js
function navigateTo(hash) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      renderPage(hash);
      window.scrollTo(0, 0);
    });
  } else {
    renderPage(hash);
    window.scrollTo(0, 0);
  }
}

window.addEventListener('hashchange', () => {
  navigateTo(location.hash.slice(1) || '/overview');
});
```

```css
/* デフォルトのクロスフェード（old → new）をカスタマイズ */
::view-transition-old(root) {
  animation: fade-out 100ms ease-in;
}
::view-transition-new(root) {
  animation: fade-in 150ms ease-out;
}

@keyframes fade-out {
  to { opacity: 0; }
}
@keyframes fade-in {
  from { opacity: 0; }
}
```

**利点**:
- ブラウザがスナップショットを撮り、DOM 更新中に古い状態を表示し続けるため、ちらつかない
- CSS だけでアニメーションをカスタマイズ可能
- `view-transition-name` で個別要素（キャラ画像など）の遷移アニメーションも定義可能

### 4-2. フォールバック（View Transitions 非対応ブラウザ）

```js
function navigateWithFallback(hash) {
  const main = document.querySelector('main');
  main.style.opacity = '0';

  // 次フレームで DOM 更新 + フェードイン
  requestAnimationFrame(() => {
    renderPage(hash);
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      main.style.opacity = '1';
    });
  });
}
```

```css
main {
  transition: opacity 120ms ease-out;
}
```

### 4-3. scroll-to-top の注意点

SPA ではブラウザが自動で scroll-to-top しない。`window.scrollTo(0, 0)` を DOM 更新の直後に呼ぶ。View Transitions API 内のコールバックに含めると、スナップショット取得後に実行されるため自然な遷移になる。

---

## 5. prefers-reduced-motion 対応

### 5-1. 一括無効化パターン

spec 要件: `prefers-reduced-motion` では即時切り替え。

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

**なぜ `0ms` ではなく `0.01ms` か**: `0ms` だと一部のブラウザで `animationend` / `transitionend` イベントが発火しない場合がある。`0.01ms` は実質即時だがイベントは正常に発火する。

### 5-2. View Transitions API との統合

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }
}
```

### 5-3. JS 側での対応

stagger アニメーションなど、JS で制御するモーションも対応する:

```js
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function getStaggerDelay(index) {
  return prefersReducedMotion.matches ? 0 : index * 30;
}

// 設定変更をリアルタイムに反映
prefersReducedMotion.addEventListener('change', () => {
  // 必要に応じて再レンダリング
});
```

---

## 6. アクセントカラーの展開（color-mix）

### 6-1. キャラ固有カラーの 3 段階展開

spec 要件: dim(10%)・mid(25%)・vivid(100%) の 3 段階を `color-mix()` で生成。

```css
:root {
  /* 例: 龍之介のテーマカラー */
  --char-color: oklch(0.65 0.15 30);
}

.card[data-char] {
  /* 3段階のアクセント */
  --char-color-dim:   color-mix(in oklch, var(--char-color) 10%, var(--surface-0));
  --char-color-mid:   color-mix(in oklch, var(--char-color) 25%, var(--surface-0));
  --char-color-vivid: var(--char-color);
}
```

**用途の統一**:
- `dim` → カード背景のティント、降格圏の微かな赤み
- `mid` → ボーダー、ホバー時のグロー、席番号バッジの背景
- `vivid` → フォーカスリング、アクティブ状態、ステータスピル

### 6-2. color-mix() のブラウザサポート

- 2024 年初頭に全主要ブラウザでサポート（Baseline Widely Available）
- OKLCH 色空間と併用すると、知覚的に均一なミキシングが得られる

---

## 7. モバイル底部タブバー

### 7-1. safe-area-inset-bottom 対応

spec 要件: 底部バー高さ 56〜64px、safe-area-inset-bottom を考慮。

```css
.bottom-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(56px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  background: var(--surface-1);
  border-top: 1px solid oklch(1 0 0 / 0.06);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 100;
}

/* main の下マージン確保 */
main {
  padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 16px);
}
```

**必須**: `<meta name="viewport">` に `viewport-fit=cover` を追加:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```

### 7-2. 現在地ハイライト

```css
.tab-item[aria-current="page"] {
  color: var(--accent-primary);
}
.tab-item[aria-current="page"]::after {
  content: '';
  position: absolute;
  top: 0;
  left: 25%;
  right: 25%;
  height: 2px;
  background: var(--accent-primary);
  border-radius: 1px;
}
```

---

## 8. ボトムシート（レース詳細モーダル）

spec 要件: 620px 以下でボトムシートとして表示、max-height: 92vh。

```css
@media (max-width: 620px) {
  .race-detail-dialog {
    margin: 0;
    max-width: 100%;
    width: 100%;
    max-height: 92vh;
    position: fixed;
    bottom: 0;
    border-radius: 16px 16px 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  .race-detail-dialog::backdrop {
    background: oklch(0 0 0 / 0.6);
  }

  /* ドラッグハンドル */
  .race-detail-dialog .drag-handle {
    width: 40px;
    height: 4px;
    background: oklch(1 0 0 / 0.3);
    border-radius: 2px;
    margin: 8px auto 16px;
  }

  /* 閉じるボタンを sticky */
  .race-detail-dialog .close-btn {
    position: sticky;
    top: 0;
    z-index: 1;
  }
}

/* 背面スクロール抑止 */
body:has(dialog[open].race-detail-dialog) {
  overflow: hidden;
}
```

`<dialog>` 要素のネイティブ `.showModal()` を使えば、フォーカストラップ・Escape キー閉じ・backdrop が標準で得られる。

---

## 9. パフォーマンス留意事項

### アニメーション対象プロパティ

GPU コンポジットに乗る安全なプロパティのみをアニメーションする:

| 安全（compositor） | 危険（layout/paint） |
|---|---|
| `transform` | `width`, `height` |
| `opacity` | `top`, `left`, `margin` |
| `filter`（控えめに） | `padding`, `border-width` |

### will-change の使い方

- ホバーリフトするカードに `will-change: transform` を設定
- **常時ではなく、アニメーションが予見されるときだけ**（カードは常時表示されるので設定 OK）
- 要素数が多い場合（10 枚程度は問題なし）、不必要な will-change はメモリを圧迫する

---

## 参考リンク

- [Muzli: Dark Mode Design Systems Complete Guide](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/)
- [Material Design 3: Elevation](https://m3.material.io/styles/elevation/applying-elevation)
- [Josh W. Comeau: Designing Beautiful Shadows in CSS](https://www.joshwcomeau.com/css/designing-shadows/)
- [Elevation Design Patterns: Tokens, Shadows, and Roles](https://designsystems.surf/articles/depth-with-purpose-how-elevation-adds-realism-and-hierarchy)
- [CSS-Tricks: Different Approaches for Creating a Staggered Animation](https://css-tricks.com/different-approaches-for-creating-a-staggered-animation/)
- [Cloud Four: Staggered Animations with CSS Custom Properties](https://cloudfour.com/thinks/staggered-animations-with-css-custom-properties/)
- [web.dev: View Transitions for SPAs](https://web.dev/learn/css/view-transitions-spas)
- [MDN: View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [DebugBear: View Transition API — SPAs Without a Framework](https://www.debugbear.com/blog/view-transitions-spa-without-framework)
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
- [W3C: Using prefers-reduced-motion (WCAG Technique C39)](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)
- [Pope Tech: Design Accessible Animation and Movement](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)
- [Modern CSS Color Functions 2026: OKLCH, color-mix()](https://www.colorpick.app/blog/css-color-functions-2026-guide)
- [MDN: color-mix()](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/color-mix)
- [una.im: Modern CSS theming with light-dark(), contrast-color()](https://una.im/modern-css-theming/)
- [dev.to: Safely Position Fixed Content on Newer Mobile Devices](https://dev.to/believer/safely-position-fixed-content-on-newer-mobile-devices-5c94)
- [dev.to: Mastering Smooth Page Transitions with View Transitions API 2026](https://dev.to/krish_kakadiya_5f0eaf6342/mastering-smooth-page-transitions-with-the-view-transitions-api-in-2026-31of)
