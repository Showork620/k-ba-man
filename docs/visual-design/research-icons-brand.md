# 調査: アイコンシステム・ブランド要素

design-spec §4-8 ブランドアイデンティティ、§3-1 象徴小物・流派識別の実現に必要なデザイン知識。

---

## 1. SVG アイコンシステム（象徴モチーフ10種）

### 1-1. 配信方式の比較

| 方式 | メリット | デメリット | k-ba-man 向き |
|---|---|---|---|
| **インライン SVG** | スタイル完全制御、FOUT なし、CSS アニメーション可 | DOM 肥大化（同じアイコンの繰り返し） | △ 繰り返し使用が多い |
| **SVG スプライト**（`<use>`） | 1リクエスト、キャッシュ効率、DOM 軽量 | 外部ファイルの `<use>` は一部制約あり | **◎ 推奨** |
| **CSS マスク** | CSS のみで色変更可 | パフォーマンス最下位、複雑な SVG に不向き | × |

**推奨: SVG スプライト（`<symbol>` + `<use>`）**

10種のアイコンは繰り返し使われる（カード・ランキング行・詳細ページ）ため、スプライトが最適。アイコン数が10と少なく、HTML 内にインラインで `<svg>` スプライトシートを埋め込む方式が最もシンプル。

```html
<!-- index.html の body 直下に非表示で埋め込み -->
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
  <symbol id="icon-scroll" viewBox="0 0 24 24">
    <!-- 巻物（龍之介） -->
    <path d="..." fill="currentColor"/>
  </symbol>
  <symbol id="icon-tablet" viewBox="0 0 24 24">
    <!-- タブレット（誠） -->
    <path d="..." fill="currentColor"/>
  </symbol>
  <symbol id="icon-pointer" viewBox="0 0 24 24">
    <!-- 指し棒（美咲） -->
    <path d="..." fill="currentColor"/>
  </symbol>
  <symbol id="icon-index-card" viewBox="0 0 24 24">
    <!-- 指数カード（健太） -->
    <path d="..." fill="currentColor"/>
  </symbol>
  <symbol id="icon-stopwatch" viewBox="0 0 24 24">
    <!-- ストップウォッチ（鉄平） -->
    <path d="..." fill="currentColor"/>
  </symbol>
  <symbol id="icon-smartphone" viewBox="0 0 24 24">
    <!-- スマホ（さくら） -->
    <path d="..." fill="currentColor"/>
  </symbol>
  <symbol id="icon-binoculars" viewBox="0 0 24 24">
    <!-- 双眼鏡（葵） -->
    <path d="..." fill="currentColor"/>
  </symbol>
  <symbol id="icon-ticket" viewBox="0 0 24 24">
    <!-- 馬券（陽菜） -->
    <path d="..." fill="currentColor"/>
  </symbol>
  <symbol id="icon-checklist" viewBox="0 0 24 24">
    <!-- チェックボード（優子） -->
    <path d="..." fill="currentColor"/>
  </symbol>
  <symbol id="icon-anemometer" viewBox="0 0 24 24">
    <!-- 風速計（吾郎） -->
    <path d="..." fill="currentColor"/>
  </symbol>
</svg>
```

### 1-2. 使用方法

```html
<!-- 使用箇所で <use> で参照 -->
<svg class="char-icon" width="20" height="20" aria-hidden="true">
  <use href="#icon-scroll"/>
</svg>
<span>龍之介</span>
```

### 1-3. アイコンサイズのグリッド

| コンテキスト | サイズ | 用途 |
|---|---|---|
| 16px | ランキング行のインライン、メタ情報 |
| 20px | カード内、ラベル横 |
| 24px | キャラクター詳細、ヒーロー近辺 |

すべてのアイコンを **24×24 の viewBox** で統一設計し、表示サイズは `width` / `height` 属性で制御。ストローク幅は 1.5〜2px を基準とし、16px 表示でも潰れない太さを確保。

```css
.char-icon {
  display: inline-block;
  vertical-align: -0.125em; /* テキストベースラインとの調整 */
  flex-shrink: 0;
}

.char-icon--sm { width: 16px; height: 16px; }
.char-icon--md { width: 20px; height: 20px; }
.char-icon--lg { width: 24px; height: 24px; }
```

### 1-4. キャラカラーでの着色

`currentColor` を使うことで、親要素の `color` プロパティを自動継承:

```css
/* SVG 内の fill/stroke に currentColor を使用 */

/* キャラカラーで着色 */
.char-icon-colored {
  color: var(--char-color, var(--muted));
}

/* ホバー時に vivid に変化 */
.char-card:hover .char-icon-colored {
  color: color-mix(in oklch, var(--char-color) 100%, transparent);
}
```

**多色アイコンが必要な場合**（将来的な拡張）:

```html
<symbol id="icon-scroll" viewBox="0 0 24 24">
  <path d="..." fill="var(--icon-primary, currentColor)"/>
  <path d="..." fill="var(--icon-secondary, currentColor)" opacity="0.5"/>
</symbol>
```

### 1-5. アクセシビリティ

| パターン | 実装 | 用途 |
|---|---|---|
| **装飾的**（テキスト併記） | `aria-hidden="true"` | カード内でキャラ名の横に表示 |
| **意味的**（アイコン単体） | `role="img"` + `aria-label="巻物"` | アイコンのみで流派を示す場合 |

```html
<!-- 装飾的: テキストが隣にある -->
<svg class="char-icon" aria-hidden="true"><use href="#icon-scroll"/></svg>
<span>血統・配合</span>

<!-- 意味的: アイコンのみ -->
<svg class="char-icon" role="img" aria-label="血統・配合">
  <use href="#icon-scroll"/>
</svg>
```

### 1-6. アイコンデザインの統一ガイドライン

- **ストロークベース**: 線画スタイルで統一（塗りつぶしではなく）
- **コーナー半径**: 1px で統一（丸みを持たせすぎない）
- **ストローク幅**: 1.5px（24px viewBox 基準）
- **パディング**: viewBox 内に 1px のマージン（22×22 の描画エリア）
- **視覚的重量**: 10個のアイコンが並んだとき同程度の「重さ」に見えること
- **方向性**: 可能な限り正面向き or 45度で統一

---

## 2. ロゴマーク「K」円形バッジ

### 2-1. 現行実装の評価

```css
/* 現行: styles.css */
.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 50%;
  background: var(--gold);
  color: var(--bg);
  font-family: var(--f-mono);
  font-weight: 700;
  font-size: 0.95rem;
  flex-shrink: 0;
}
```

現行実装は CSS テキストベース。**最小 28px まで縮小可能**で、design-spec の要件を満たしている。

### 2-2. SVG ロゴへの移行推奨

テキストベースの「K」は環境によりフォントレンダリングが異なる。SVG 化することで:
- フォントに依存しない一貫した表示
- favicon との共用
- OGP 画像生成での流用

```html
<!-- SVG ロゴマーク -->
<svg class="brand-mark" viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
  <circle cx="18" cy="18" r="18" fill="var(--gold)"/>
  <text x="18" y="19" text-anchor="middle" dominant-baseline="central"
        fill="var(--bg)" font-family="'JetBrains Mono', monospace"
        font-weight="700" font-size="15">K</text>
</svg>
```

あるいはパス化した「K」:

```html
<svg class="brand-mark" viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
  <circle cx="18" cy="18" r="18" fill="var(--gold)"/>
  <path d="M13 10v16M13 18l10-8M13 18l10 8" stroke="var(--bg)"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
```

### 2-3. ロゴロックアップ

現行のヘッダー実装はすでにロックアップ構造を持っている:

```
[K バッジ] [k-ba-man        ]
           [Roundtable Forecast Drama]
```

改善案:

```css
.brand {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  min-height: 44px; /* タッチターゲット */
  text-decoration: none;
}

.brand-mark {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

/* レスポンシブ: 620px 以下でサブタイトル非表示 */
@media (max-width: 620px) {
  .brand small {
    display: none;
  }
  .brand-mark {
    width: 28px;  /* 最小サイズ */
    height: 28px;
  }
}
```

---

## 3. favicon / ブランドマーク

### 3-1. 2026年のベストプラクティス: 3ファイル構成

Evil Martians の推奨に基づき、最小限の3ファイル:

| ファイル | サイズ | 用途 |
|---|---|---|
| `favicon.ico` | 32×32 | レガシーブラウザ（IE11 等は非対象だが慣例） |
| `favicon.svg` | スケーラブル | Chrome, Firefox, Edge（ダークモード対応可） |
| `apple-touch-icon.png` | 180×180 | iOS ホーム画面 |

```html
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

### 3-2. SVG favicon のダークモード対応

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
  <style>
    circle { fill: #c9a840; }
    path { stroke: #0b0c11; }
    @media (prefers-color-scheme: dark) {
      circle { fill: #dfc060; }
      path { stroke: #0b0c11; }
    }
  </style>
  <circle cx="18" cy="18" r="18"/>
  <path d="M13 10v16M13 18l10-8M13 18l10 8"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
```

### 3-3. PWA 対応（将来）

```json
// manifest.webmanifest
{
  "icons": [
    { "src": "/icon-192.png", "type": "image/png", "sizes": "192x192" },
    { "src": "/icon-512.png", "type": "image/png", "sizes": "512x512" }
  ]
}
```

### 3-4. apple-touch-icon の注意点

- 180×180px の PNG、**透過なし**（iOS が背景色を勝手に追加する）
- 角丸は iOS が自動適用するため、画像自体は正方形
- k-ba-man の場合: gold 背景に黒い「K」が最適

---

## 4. 記号体系の視覚設計

### 4-1. 印記号（◎○▲△）

Unicode 文字としてテキスト表示するが、フォント・ブラウザ間で描画サイズが異なる問題がある。

**安定した表示のための CSS:**

```css
.mark {
  display: inline-block;
  width: 1.2em;
  text-align: center;
  font-family: var(--f-sans); /* CJK フォントで統一 */
  font-size: inherit;
  line-height: 1;
  vertical-align: baseline;
}

/* 意味的な区別（色ではなくテキストで伝える — design-spec 準拠） */
/* 色分けはせず、テキストとして表示 */
.mark {
  color: var(--ink);
}
```

**印の表示サイズ統一テクニック:**

```css
/* 各印記号はフォントによって幅が異なるため、固定幅コンテナで統一 */
.mark-cell {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 1.6em;
  height: 1.6em;
  font-size: 0.9em;
}
```

**クロスブラウザの注意点:**
- ◎○▲△ は Unicode の CJK 互換文字で、全角幅を持つ
- `font-family` を日本語フォント（Noto Sans JP）に固定すれば描画が安定
- `font-variant-east-asian` は将来的に使えるが、現時点でのサポートは限定的
- 英語フォントにフォールバックすると記号サイズが変わるため、明示的に日本語フォントを指定

### 4-2. 席番号の円形バッジ

```css
.seat-badge {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: var(--badge-size, 28px);
  height: var(--badge-size, 28px);
  border-radius: 50%;
  background: var(--char-color, var(--muted));
  color: #fff;
  font-family: var(--f-mono);
  font-weight: 700;
  font-size: calc(var(--badge-size, 28px) * 0.43);
  line-height: 1;
  flex-shrink: 0;
}

/* サイズバリアント */
.seat-badge--sm { --badge-size: 22px; }
.seat-badge--md { --badge-size: 28px; }
.seat-badge--lg { --badge-size: 36px; }
```

**コントラスト確保:**

白文字に対してキャラカラー背景の AA コントラスト比（4.5:1 以上）を確認する必要がある。明るい色（黄系・オレンジ系）のキャラカラーでは白文字のコントラストが不足する可能性:

```css
/* 明るいキャラカラー用のフォールバック */
.seat-badge--light-bg {
  color: var(--bg); /* 暗い文字色 */
}
```

### 4-3. ステータスピル（win / place / out）

design-spec の「3色固定」に対応:

```css
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 9999px;
  font-family: var(--f-mono);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.4;
  white-space: nowrap;
}

/* 的中（win）: gold 系 */
.status-pill--win {
  background: color-mix(in oklch, var(--gold) 18%, transparent);
  color: var(--gold-light);
  border: 1px solid color-mix(in oklch, var(--gold) 30%, transparent);
}

/* 3着内（place）: 藍/紫 系 */
.status-pill--place {
  background: color-mix(in oklch, #6366f1 15%, transparent);
  color: #a5b4fc;
  border: 1px solid color-mix(in oklch, #6366f1 25%, transparent);
}

/* 外れ（out）: 赤系 */
.status-pill--out {
  background: color-mix(in oklch, var(--red) 12%, transparent);
  color: #f87171;
  border: 1px solid color-mix(in oklch, var(--red) 22%, transparent);
}
```

**ドット付きバリアント:**

```css
.status-pill::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
```

### 4-4. ランク数字（gold 系表示）

```css
.rank-number {
  font-family: var(--f-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  color: var(--gold-light);
  line-height: 1;
}

/* サイズバリアント */
.rank-number--lg {
  font-size: 1.8rem;
}

.rank-number--md {
  font-size: 1.2rem;
}

/* 1位は特別な輝き */
.rank-number--first {
  color: var(--gold-light);
  text-shadow: 0 0 12px var(--gold-glow);
}

/* 降格圏（8-10位）は赤系 */
.rank-number--danger {
  color: #f87171;
}
```

---

## 5. 10色ゲートストライプ

### 5-1. 現行実装

```css
/* 現行: hard-stop gradient で10色の帯 */
.hero-band::after {
  background: linear-gradient(
    90deg,
    #7f1d1d   0%,   #7f1d1d  10%,
    #0f766e  10%,   #0f766e  20%,
    /* ... 省略 ... */
    #854d0e  90%,   #854d0e 100%
  );
  height: 4px;
}
```

### 5-2. CSS 変数による一元管理への移行

キャラカラーを `:root` で定義し、ストライプもそこから生成:

```css
:root {
  --c-tatsunosuke: #7f1d1d;
  --c-makoto:      #0f766e;
  --c-misaki:      #6d28d9;
  --c-kenta:       #15803d;
  --c-teppei:      #a16207;
  --c-sakura:      #be123c;
  --c-aoi:         #1d4ed8;
  --c-hina:        #ea580c;
  --c-yuko:        #047857;
  --c-goro:        #854d0e;
}

.gate-stripe {
  height: 4px;
  background: linear-gradient(
    90deg,
    var(--c-tatsunosuke) 0%,   var(--c-tatsunosuke) 10%,
    var(--c-makoto)      10%,  var(--c-makoto)      20%,
    var(--c-misaki)      20%,  var(--c-misaki)      30%,
    var(--c-kenta)       30%,  var(--c-kenta)       40%,
    var(--c-teppei)      40%,  var(--c-teppei)      50%,
    var(--c-sakura)      50%,  var(--c-sakura)      60%,
    var(--c-aoi)         60%,  var(--c-aoi)         70%,
    var(--c-hina)        70%,  var(--c-hina)        80%,
    var(--c-yuko)        80%,  var(--c-yuko)        90%,
    var(--c-goro)        90%,  var(--c-goro)        100%
  );
}
```

### 5-3. Flexbox 方式（代替）

```css
.gate-stripe-flex {
  display: flex;
  height: 4px;
}

.gate-stripe-flex > span {
  flex: 1;
}
```

```html
<div class="gate-stripe-flex">
  <span style="background: var(--c-tatsunosuke)"></span>
  <span style="background: var(--c-makoto)"></span>
  <!-- ... 10色分 ... -->
</div>
```

**gradient vs flexbox の比較:**

| 基準 | gradient | flexbox |
|---|---|---|
| コード量 | やや多い | シンプル |
| 個別の hover | 不可 | 可能 |
| アニメーション | 色変化のみ | 幅・高さ変化可 |
| パフォーマンス | 再描画なし | DOM 要素10個 |
| k-ba-man での推奨 | **ヒーロー下** | 将来のインタラクティブ用途 |

### 5-4. 配置ルール

design-spec の「1箇所のみ使用」に従い:
- **ヒーロー下部**: `::after` 疑似要素で配置（現行方式を継続）
- **フッター上部**: 同様に `::before` 疑似要素

```css
.site-footer::before {
  content: '';
  display: block;
  height: 4px;
  background: /* gate-stripe と同じ gradient */;
  margin-bottom: clamp(24px, 4vw, 40px);
}
```

### 5-5. レスポンシブでの見え方

10色ストライプは幅に関わらず均等分割（%ベース）のため、レスポンシブ対応は不要。高さは固定（4px）で、モバイルでもデスクトップでも同じ見え方を維持。

---

## 6. ブランド一貫性の管理

### 6-1. vanilla CSS でのデザインシステム最小構成

フレームワーク不使用のプロジェクトで一貫性を維持するための構造:

```
styles.css
├── TOKENS        — カラー、タイポ、余白、角丸
├── RESET         — ブラウザリセット
├── TYPOGRAPHY    — 見出し、本文、ラベル
├── BRAND         — ロゴ、ゲートストライプ、記号体系
├── LAYOUT        — コンテナ、グリッド、ヘッダー
├── COMPONENTS    — カード、バッジ、ピル、ボタン
└── PAGE-SPECIFIC — ヒーロー、ライブ、成績、キャラ
```

### 6-2. トークンによる一貫性確保

```css
:root {
  /* ===== ブランドカラー ===== */
  --brand-primary: var(--gold);
  --brand-mark-bg: var(--gold);
  --brand-mark-fg: var(--bg);

  /* ===== キャラカラー ===== */
  /* 10色をここで一元定義。ストライプ・バッジ・カードすべてここから参照 */

  /* ===== 記号体系 ===== */
  --status-win:   var(--gold);
  --status-place: #6366f1;
  --status-out:   var(--red);

  /* ===== コンポーネント共通 ===== */
  --pill-radius: 9999px;
  --badge-radius: 50%;
  --card-radius: var(--radius-md);
}
```

### 6-3. 命名規則の統一

| 接頭辞 | 用途 | 例 |
|---|---|---|
| `--c-` | キャラカラー | `--c-tatsunosuke`, `--c-makoto` |
| `--char-` | キャラ動的注入 | `--char-color`（インラインで設定） |
| `--status-` | セマンティック状態 | `--status-win`, `--status-out` |
| なし | グローバルトークン | `--bg`, `--ink`, `--gold` |

### 6-4. チェックリスト: ブランド要素の一貫性

- [ ] ロゴマーク「K」: SVG 化し、ヘッダー・favicon・OGP で同一ソースを使用
- [ ] ゲートストライプ: CSS 変数でキャラカラーを参照（ハードコーディングしない）
- [ ] 席番号バッジ: すべてのコンテキスト（カード・ランキング・予想）で同じ CSS クラスを使用
- [ ] ステータスピル: win/place/out の3色を CSS 変数で定義し、全ページで統一
- [ ] 象徴アイコン: 全10種を SVG スプライトで管理し、`currentColor` で着色
- [ ] 印記号: 色分けせずテキスト表示、フォントを日本語フォントに固定
- [ ] ランク数字: `tabular-nums` + `--f-mono` + gold 系カラー

---

## 7. 実装優先度

| 優先度 | 項目 | 理由 |
|---|---|---|
| **P0** | ゲートストライプの CSS 変数化 | 現行ハードコーディングの解消 |
| **P0** | 席番号バッジの共通 CSS | 複数ページで繰り返し使用 |
| **P0** | ステータスピル 3色 | 成績・ライブで必須 |
| **P0** | favicon 3ファイル構成 | 現在未設定 |
| **P1** | ロゴマーク SVG 化 | フォント依存の解消 |
| **P1** | 印記号の統一 CSS | クロスブラウザ安定性 |
| **P1** | ランク数字の gold 表示 | ランキングの視覚強化 |
| **P2** | SVG スプライトシート | 象徴モチーフの実装 |
| **P2** | キャラカラー命名規則の統一 | 保守性向上 |
| **P3** | PWA manifest | 将来の拡張 |

---

## 参考リンク

- [Icon Fonts vs. SVG Sprites vs. Inline SVGs in 2026](https://allsvgicons.com/blog/icon-fonts-vs-svg-sprites-vs-inline-svgs/)
- [SVG Sprites in 2026: Modern Patterns](https://www.svggenie.com/blog/svg-sprite-modern-guide)
- [Change SVG Icon Color with CSS Variables — 2026 Guide](https://allsvgicons.com/blog/change-svg-icon-color-with-css/)
- [Using currentColor in 2025](https://frontendmasters.com/blog/using-currentcolor-in-2025/)
- [SVG images accessibility](https://a11y-guidelines.orange.com/en/articles/accessible-svg/)
- [How to Favicon in 2026: Three files](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs)
- [Favicon Best Practices Guide for 2026](https://faviconstudio.com/blog/favicon-best-practices-2026)
- [Stripes in CSS (CSS-Tricks)](https://css-tricks.com/stripes-css/)
- [Building Website Headers with CSS Flexbox](https://ishadeed.com/article/website-headers-flexbox/)
- [How to create a badge / avatar in CSS](https://dev.to/michelc/how-to-create-a-badge-avatar-in-css-17p7)
