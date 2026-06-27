# パフォーマンス最適化 — 調査知見

design-spec.md §4-7 の要件を vanilla HTML/CSS/JS で実現するための技術知見。

---

## 1. Critical CSS のインライン化

### 概要

ファーストビュー（ヘッダー + ヒーロー）の CSS を `<style>` タグで直接 `<head>` に埋め込み、外部 CSS のダウンロード完了を待たずに初回描画（FCP: First Contentful Paint）を開始する手法。

### 14KB ルール

TCP の初回ラウンドトリップで送れるデータ量は約 14KB（圧縮後）。ファーストビューの HTML + インライン CSS がこの範囲に収まれば、1 RTT で描画開始できる。

### ビルドツール不使用での分割戦略

k-ba-man はビルドツールを使わない vanilla 構成のため、手動で Critical CSS を抽出する。

```html
<head>
  <!-- Critical CSS: ヘッダー + ヒーロー + リセット + トークン -->
  <style>
    /* トークン（カスタムプロパティ） */
    :root {
      color-scheme: dark;
      --bg: #0b0c11;
      --surface: #111319;
      --ink: #edeae0;
      --text: #a8a59c;
      /* ... 最小限のトークン ... */
    }
    /* リセット（最小限） */
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    /* ヘッダー */
    .site-header { /* sticky header styles */ }
    /* ヒーロー */
    .hero { min-height: 80vh; /* ... */ }
  </style>

  <!-- 残りの CSS を非同期ロード -->
  <link rel="preload" href="./styles.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="./styles.css"></noscript>
</head>
```

### 実践的な手順

1. **抽出対象の特定**: ヘッダー、ヒーロー、スキップリンク、リセット、トークン（カスタムプロパティ）
2. **サイズの目安**: インライン CSS は 2-5KB（gzip 前）を目標。14KB の HTML 全体予算内に収める
3. **残りの CSS**: `<link rel="preload" as="style">` + `onload` で非同期ロード
4. **`<noscript>` フォールバック**: JS 無効環境でもスタイルが適用されるように

### 現行実装との差分

現行の `index.html` は `<link rel="stylesheet" href="./styles.css">` のみでレンダーブロッキング。`styles.css` 全体（現在約 700 行）のダウンロード完了まで描画がブロックされる。

### 推奨

| 項目 | 推奨 |
|---|---|
| インライン化する範囲 | トークン + リセット + ヘッダー + ヒーロー + スキップリンク |
| 残りの CSS のロード | `<link rel="preload" as="style" onload="...">` |
| サイズ目標 | インライン CSS 3KB 以下（gzip 前） |
| 検証方法 | Chrome DevTools > Performance > FCP の改善を確認 |

---

## 2. 画像最適化

### 2-1. 現状分析

| ファイル | 現行サイズ | 目標 | 倍率 |
|---|---|---|---|
| mini.png（10人分合計） | 5.0 MB（平均 512KB/枚） | 300KB（30KB/枚） | **17倍削減** |
| real.png（10人分） | 未計測（推定 1MB+/枚） | 200KB/枚 | — |

**現行の mini.png は 460-613KB と目標の 30KB を大幅に超過**。WebP/AVIF 変換と適切なリサイズが必須。

### 2-2. width / height 属性による CLS 防止

```html
<!-- width/height を明示 → ブラウザが読み込み前にアスペクト比を確保 -->
<img src="assets/characters/tatsunosuke/mini.png"
     width="200" height="267"
     alt="龍之介">
```

ブラウザは `width` / `height` 属性から自動的に `aspect-ratio` を算出し、画像読み込み前にスペースを確保する。**CSS で `aspect-ratio` を上書きする場合も、HTML 属性は残しておく**（ブラウザの UA スタイルシートが `aspect-ratio: auto W / H` を適用するため）。

### 2-3. loading 属性の使い分け

| 位置 | 属性 | 理由 |
|---|---|---|
| ヒーロー画像（above-the-fold） | `loading="eager" fetchpriority="high"` | LCP を最速にする |
| キャラカード 1-5枚目（ファーストビュー内） | `loading="eager"`（fetchpriority は不要） | ファーストビュー内で遅延なし |
| キャラカード 6枚目以降 | `loading="lazy"` | ビューポート外は遅延ロード |
| キャラ詳細の大型立ち絵 | `loading="eager" fetchpriority="high"` | ページのメインビジュアル |
| 成績履歴内のアイコン | `loading="lazy"` | スクロール後に表示 |

**重要**: `loading="lazy"` と `fetchpriority="high"` を同時に指定してはならない（矛盾する指示）。

### 2-4. ヒーロー画像のプリロード

```html
<head>
  <!-- ヒーロー背景画像を最優先でプリロード -->
  <link rel="preload" as="image" href="./assets/hero-ensemble.webp"
        fetchpriority="high">

  <!-- レスポンシブ画像のプリロード（将来の WebP/AVIF 対応時） -->
  <link rel="preload" as="image"
        imagesrcset="./assets/hero-480.avif 480w,
                     ./assets/hero-960.avif 960w,
                     ./assets/hero-1920.avif 1920w"
        imagesizes="100vw"
        type="image/avif">
</head>
```

**効果**: プリロードされた LCP 画像は 'good' LCP 達成率 81%（未プリロード時 64%）という調査結果がある（2025 Web Almanac）。現時点でプリロードを実装しているページはわずか 2.1%。

### 2-5. WebP / AVIF 対応の `<picture>` パターン

```html
<picture>
  <!-- 最も効率的なフォーマットを先に -->
  <source srcset="assets/characters/tatsunosuke/mini.avif" type="image/avif">
  <source srcset="assets/characters/tatsunosuke/mini.webp" type="image/webp">
  <!-- フォールバック -->
  <img src="assets/characters/tatsunosuke/mini.png"
       width="200" height="267"
       alt="龍之介"
       loading="lazy"
       decoding="async">
</picture>
```

**フォーマット別のサイズ目安**（同品質比較）:

| フォーマット | 圧縮率（JPEG比） | ブラウザ対応 |
|---|---|---|
| AVIF | 50-60% 小さい | Chrome, Firefox, Safari 16.4+ |
| WebP | 25-35% 小さい | 全主要ブラウザ |
| PNG | ベースライン | 全ブラウザ |

### 2-6. mini.png 30KB 目標の達成戦略

1. **リサイズ**: 現行の元画像サイズ（推定 500-800px 幅）を、一覧での最大表示幅 200px の 2x = 400px 幅に縮小
2. **WebP 変換**: PNG → WebP で 70-80% 削減
3. **品質調整**: WebP quality 75-80 で十分な品質を維持
4. **結果見込み**: 400px 幅 × WebP q80 → 約 20-40KB（目標達成圏内）

```bash
# 変換コマンド例（cwebp）
cwebp -q 80 -resize 400 0 input.png -o output.webp
```

---

## 3. CLS (Cumulative Layout Shift) 対策

### 3-1. 画像コンテナの aspect-ratio

```css
/* キャラカード画像コンテナ */
.char-card-img {
  aspect-ratio: 3 / 4;    /* design-spec: 最低 3:4、推奨 2:3 */
  overflow: hidden;
  background: var(--surface-2); /* プレースホルダー背景 */
}

.char-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center; /* バスト〜ウエスト中心 */
}

/* ランキング行のアバター */
.rank-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

/* プロフィールヒーロー */
.profile-hero-img {
  aspect-ratio: 2 / 3;
  max-height: min(50vh, 360px); /* モバイル制限 */
}

/* auto キーワードとの組み合わせ */
.char-card-img img {
  aspect-ratio: auto 3 / 4;
  /* auto: 画像のネイティブ比率を優先。読み込み前は 3:4 をフォールバック */
}
```

### 3-2. Web Font の CLS 防止

```css
/* @font-face でメトリクスを調整し、フォント切り替え時のリフローを最小化 */
@font-face {
  font-family: 'Noto Sans JP Fallback';
  src: local('Hiragino Sans'), local('Yu Gothic UI'), local('system-ui');
  /* Noto Sans JP のメトリクスに近づける */
  size-adjust: 100%;
  ascent-override: 88%;
  descent-override: 22%;
  line-gap-override: 0%;
}

@font-face {
  font-family: 'Shippori Mincho Fallback';
  src: local('Yu Mincho'), local('HiraMinProN-W3'), local('serif');
  size-adjust: 95%;
  ascent-override: 90%;
  descent-override: 23%;
  line-gap-override: 0%;
}

:root {
  --f-sans: 'Noto Sans JP', 'Noto Sans JP Fallback', sans-serif;
  --f-serif: 'Shippori Mincho B1', 'Shippori Mincho Fallback', serif;
}
```

**注意点**:
- CJK フォントのメトリクス値はラテンフォントと大きく異なるため、実測が必要
- `size-adjust` は全グリフの幅をスケールするため、完全一致は困難。CJK では「ほぼゼロ CLS」を目標とする
- Google Fonts は CJK フォントを 100+ の unicode-range スライスに分割して配信する。各スライスは 100-200 文字で、必要なスライスだけがロードされる

### 3-3. ヒーローセクションの最小高さ

```css
.hero {
  min-height: 80vh;
  min-height: 80svh; /* Safari の svh をプログレッシブに */
  display: grid;
  place-content: center;
}

/* ヒーロー内の画像領域も最小高さを確保 */
.hero-visual {
  min-height: 300px; /* 画像ロード前のスペース確保 */
  background: var(--surface); /* プレースホルダー */
}
```

### 3-4. スケルトンプレースホルダー

コンテンツの読み込み前に表示するスケルトンで CLS を防止する:

```css
.skeleton {
  background: var(--surface-2);
  border-radius: var(--radius);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* reduced-motion 対応 */
@media (prefers-reduced-motion: reduce) {
  .skeleton { animation: none; opacity: 0.6; }
}
```

---

## 4. vanilla SPA のパフォーマンス

### 4-1. JSON データの読み込みタイミング

現行の実装ではデータを `<script>` タグでグローバル変数として読み込んでいる:

```html
<!-- 現行: body 末尾で同期的に読み込み -->
<script src="./data/race-history.v1.js"></script>
<script src="./data/live-race.v1.js"></script>
<script src="./api/race-history-api.js"></script>
<script src="./api/live-race-api.js"></script>
<script src="./app.js"></script>
```

**最適化オプション**:

```html
<!-- オプション A: defer 属性（現行のグローバル変数方式と互換） -->
<!-- defer は DOMContentLoaded 前に実行、順序を保証 -->
<script defer src="./data/race-history.v1.js"></script>
<script defer src="./data/live-race.v1.js"></script>
<script defer src="./api/race-history-api.js"></script>
<script defer src="./api/live-race-api.js"></script>
<script defer src="./app.js"></script>
```

`defer` を追加することで、スクリプトのダウンロードが HTML パースと並行して行われる。実行順序は保証されるため、グローバル変数の依存関係も壊れない。

```html
<!-- オプション B: ヘッドで preload + body 末尾で実行 -->
<head>
  <link rel="preload" href="./data/race-history.v1.js" as="script">
  <link rel="preload" href="./app.js" as="script">
</head>
```

**推奨**: オプション A（`defer` 追加）が最もリスクが低い。現行の同期 `<script>` は HTML パースをブロックするため、`defer` 追加で FCP が改善される。

### 4-2. DOM 操作のバッチ化（DocumentFragment）

```javascript
// ❌ 悪い例: 10回の DOM 操作 → 10回のリフロー可能性
function renderCharacterGrid(characters) {
  const grid = document.querySelector('.character-grid');
  characters.forEach(char => {
    const card = createCharacterCard(char);
    grid.appendChild(card); // 毎回リフローの可能性
  });
}

// ✅ 良い例: DocumentFragment で一括追加 → 1回のリフロー
function renderCharacterGrid(characters) {
  const grid = document.querySelector('.character-grid');
  const fragment = document.createDocumentFragment();

  characters.forEach(char => {
    const card = createCharacterCard(char);
    fragment.appendChild(card); // フラグメント内 → リフローなし
  });

  grid.appendChild(fragment); // 1回の DOM 挿入
}
```

**効果**: 10人のキャラカードを一括追加する場合、個別追加と比べてリフロー回数が 10 → 1 に削減。大量データ（レース履歴等）ではさらに効果大。

### 4-3. レイアウトスラッシングの回避

```javascript
// ❌ レイアウトスラッシング: 読み → 書き → 読み → 書き
elements.forEach(el => {
  const height = el.offsetHeight; // 読み（レイアウト強制）
  el.style.height = height + 10 + 'px'; // 書き（レイアウト無効化）
});

// ✅ 読みを先にバッチ、書きを後にバッチ
const heights = elements.map(el => el.offsetHeight); // 全部読む
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px'; // 全部書く
});
```

### 4-4. パッシブスクロールリスナー

```javascript
// スクロールイベントに passive: true を指定
// → ブラウザにスクロールをブロックしないことを宣言
window.addEventListener('scroll', handleScroll, { passive: true });

// ❌ passive: true の場合、preventDefault() は呼べない
// 呼んでも無視される（コンソールに警告）

// ✅ IntersectionObserver で代替できるケースは代替する
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

// 各カードを監視（stagger アニメーション用途にも有効）
document.querySelectorAll('.char-card').forEach(card => {
  observer.observe(card);
});
```

### 4-5. イベントデリゲーション

```javascript
// ❌ 10枚のカードに個別リスナー
document.querySelectorAll('.char-card').forEach(card => {
  card.addEventListener('click', handleCardClick);
});

// ✅ 親要素に1つだけリスナー（動的に追加される要素にも対応）
document.querySelector('.character-grid').addEventListener('click', (e) => {
  const card = e.target.closest('.char-card');
  if (card) {
    const charId = card.dataset.charId;
    navigateTo(`#/characters/${charId}`);
  }
});
```

---

## 5. 現行実装の改善チェックリスト

| 優先度 | 項目 | 現状 | 改善策 |
|---|---|---|---|
| **P0** | mini.png サイズ | 460-613KB/枚 | WebP 変換 + 400px リサイズ → 30KB 目標 |
| **P0** | script の defer | 未指定（同期読み込み） | 全 script に `defer` 追加 |
| **P0** | 画像の width/height | 未指定 | 全 img に明示 |
| **P1** | ヒーロー画像 preload | 未実装 | `<link rel="preload">` 追加 |
| **P1** | Critical CSS インライン | 未実装 | トークン+ヘッダー+ヒーローを `<style>` に抽出 |
| **P1** | 画像の loading 属性 | 未指定 | above-the-fold: eager、他: lazy |
| **P1** | aspect-ratio | 未設定 | 画像コンテナに aspect-ratio 追加 |
| **P2** | フォント CLS | font-display: swap のみ | fallback メトリクス調整 |
| **P2** | DocumentFragment | 未使用（要確認） | カード一括追加をフラグメント化 |
| **P2** | パッシブリスナー | 未確認 | scroll/touch に passive: true |
| **P3** | WebP/AVIF 対応 | PNG のみ | `<picture>` + 複数フォーマット |
| **P3** | イベントデリゲーション | 未確認 | 親要素での一括ハンドリング |

---

## 6. パフォーマンス計測の基準

### Core Web Vitals 目標

| 指標 | 目標値 | 意味 |
|---|---|---|
| LCP (Largest Contentful Paint) | ≤ 2.5s | 最大コンテンツの描画完了 |
| FID / INP (Interaction to Next Paint) | ≤ 200ms | 操作への応答速度 |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | レイアウトの安定性 |
| FCP (First Contentful Paint) | ≤ 1.8s | 初回コンテンツの描画 |

### 検証ツール

- Chrome DevTools > Lighthouse（ローカル）
- PageSpeed Insights（フィールドデータ）
- Chrome DevTools > Performance タブ（FCP/LCP の内訳分析）
- Chrome DevTools > Network タブ（リソースの読み込み順序・優先度確認）

---

## Sources

- [Critical CSS: How to Boost Your Website's Speed and UX (NitroPack)](https://nitropack.io/blog/critical-css/)
- [Inlining Critical CSS: Does It Make Your Website Faster? (DebugBear)](https://www.debugbear.com/blog/critical-css)
- [Inlining critical CSS for better web performance (Go Make Things)](https://gomakethings.com/inlining-critical-css-for-better-web-performance/)
- [Optimize resource loading with the Fetch Priority API (web.dev)](https://web.dev/articles/fetch-priority)
- [Don't Lazy-Load Your LCP Image (Unlighthouse)](https://unlighthouse.dev/learn-lighthouse/lcp/lcp-lazy-loaded)
- [Preload late-discovered Hero images faster (Addy Osmani)](https://addyosmani.com/blog/preload-hero-images/)
- [How To Preload Your LCP Image (DebugBear)](https://www.debugbear.com/blog/preload-largest-contentful-paint-image)
- [Fixing layout shifts caused by web fonts (Vincent Bernat)](https://vincent.bernat.ch/en/blog/2024-cls-webfonts)
- [A New Way To Reduce Font Loading Impact: CSS Font Descriptors (Smashing Magazine)](https://www.smashingmagazine.com/2021/05/reduce-font-loading-impact-css-descriptors/)
- [Best practices for fonts (web.dev)](https://web.dev/articles/font-best-practices)
- [CSS Aspect Ratio: Prevent Layout Shifts (Digital Thrive)](https://digitalthriveai.com/en-us/resources/docs/web-development/aspect-ratio/)
- [Document Fragments: The Secret to Fast DOM Manipulation (Certificates.dev)](https://certificates.dev/blog/document-fragments-the-secret-to-fast-clean-dom-manipulation-in-javascript)
- [JavaScript DOM Best Practices 2026 (CodeZone)](https://codezone.blog/javascript-dom-best-practices-2026/)
- [Handling Scroll Events Efficiently with Passive Listeners](https://medium.com/@AlexanderObregon/handling-scroll-events-efficiently-with-passive-listeners-in-javascript-bd7d463a5871)
- [Image Optimization in 2025: WebP/AVIF, srcset, and Preload (AI Bud)](https://aibudwp.com/image-optimization-in-2025-webp-avif-srcset-and-preload/)
