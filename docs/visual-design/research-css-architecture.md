# CSS カスタムプロパティ アーキテクチャ調査

design-spec.md の全デザイン要件を横断する CSS 設計パターンの調査結果。現行 `site/styles.css`（2780行・単一ファイル）の構造を踏まえ、k-ba-man プロジェクトに最適化した提言を含む。

---

## 1. デザイントークンの階層設計

### 1-1. 3層トークンアーキテクチャ

業界標準は **Primitive → Semantic → Component** の3層構造。W3C Design Tokens Community Group 仕様（2026年時点で主要ツールが対応）でも、この階層が基本型として定義されている。

```
┌─────────────────────────────────────────────────┐
│  Primitive（原始値）                              │
│  生の値。意味を持たない。                          │
│  例: --color-slate-900: #0b0c11                  │
│      --space-4: 16px                             │
│      --font-size-sm: 0.875rem                    │
├─────────────────────────────────────────────────┤
│  Semantic（意味的トークン）                        │
│  用途・意図を記述。Primitive を参照。              │
│  例: --color-bg: var(--color-slate-900)          │
│      --color-text-primary: var(--color-cream-100)│
│      --space-section: var(--space-12)            │
├─────────────────────────────────────────────────┤
│  Component（コンポーネントトークン）               │
│  特定UIの局所的な決定。Semantic を参照。           │
│  例: --card-bg: var(--color-surface-1)           │
│      --card-border: var(--color-border-default)  │
│      --rank-number-color: var(--color-gold)      │
└─────────────────────────────────────────────────┘
```

**k-ba-man への適用判断**: 3層すべてを厳密に分離するのはオーバーエンジニアリング。ビルドツールなし・単一テーマ（ダーク専用）の条件下では、**Primitive と Semantic の2層 + キャラカラーの動的注入**が最適解。

### 1-2. k-ba-man 推奨トークン構造

```css
:root {
  /* ── Primitive: 生の色値 ── */
  --raw-slate-950:  #0b0c11;
  --raw-slate-900:  #111319;
  --raw-slate-850:  #181a24;
  --raw-slate-800:  #20222e;
  --raw-cream-100:  #edeae0;
  --raw-cream-300:  #a8a59c;
  --raw-slate-500:  #62647a;
  --raw-slate-600:  #3a3b4e;
  --raw-gold-500:   #c9a840;
  --raw-gold-400:   #dfc060;

  /* ── Semantic: 用途別マッピング ── */
  --color-bg:            var(--raw-slate-950);
  --color-surface-0:     var(--raw-slate-950);
  --color-surface-1:     var(--raw-slate-900);
  --color-surface-2:     var(--raw-slate-850);
  --color-surface-3:     var(--raw-slate-800);

  --color-text-primary:  var(--raw-cream-100);
  --color-text-body:     var(--raw-cream-300);
  --color-text-muted:    var(--raw-slate-500);
  --color-text-faint:    var(--raw-slate-600);

  --color-border:        #1c1e2c;
  --color-border-mid:    #252738;

  --color-accent:        var(--raw-gold-500);
  --color-accent-light:  var(--raw-gold-400);
  --color-accent-dim:    oklch(from var(--raw-gold-500) l c h / 0.10);

  /* セマンティックカラー（成績判定用） */
  --color-hit-win:       var(--raw-gold-500);
  --color-hit-place:     #818cf8;
  --color-miss:          #be3636;
  --color-rank-up:       #22c55e;
  --color-rank-down:     #f97316;
}
```

### 1-3. ダークテーマ専用の場合の簡略化

- ライトテーマ切り替えがないため、`:root` 直下にすべて定義して問題ない
- `@media (prefers-color-scheme: ...)` でのトークン切り替えは不要
- Primitive 層は `--raw-*` プレフィクスで「直接使うな」を暗示。Semantic 層のみを実装コードで使用する規約とする
- Primitive を省略して Semantic だけにしてもよい（現行はこの状態に近い）

**判断基準**: Primitive 層を設けるメリットは「将来のテーマ追加」と「値の由来の追跡」。k-ba-man ではテーマ追加の予定がないため、**現行の Semantic 直接定義を継続し、命名だけ統一する**のが現実的。

### 1-4. 命名規則

現行の問題:
- `--bg` / `--surface` / `--surface-2` / `--surface-3`: surface の番号が 0始まり か 1始まりか不統一（`--surface` が実質 surface-1）
- `--ink` / `--text` / `--muted` / `--faint`: テキスト色なのかボーダー色なのか名前から判別しにくい
- `--gold` / `--green` / `--amber` / `--red`: セマンティックな用途が名前に含まれない

推奨命名規則: `--[カテゴリ]-[プロパティ]-[修飾子]`

```
カテゴリ: color, space, font, radius, shadow
プロパティ: bg, surface, text, border, accent, hit, rank
修飾子: primary, muted, dim, light, 0-3（階層番号）
```

ただし、k-ba-man の規模（単一ファイル・1人開発）では**過度な命名の厳密さより一貫性**が重要。現行の短い名前（`--bg`, `--surface`, `--ink`）は可読性が高いので、**surface の番号統一と用途の明確化**だけ行えば十分。

---

## 2. キャラカラーの動的適用アーキテクチャ

### 2-1. 現行の実装

現行 CSS は `--accent` というカスタムプロパティを前提に設計されている。HTML 側で各キャラクターの要素に `style="--accent: #7f1d1d"` のようにインラインで注入し、CSS は `var(--accent)` を参照する。

```css
/* 現行の使用例 */
.character-card:hover {
  border-color: color-mix(in srgb, var(--accent), transparent 55%);
}

.card-media {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--accent), var(--bg) 72%) 0%,
    var(--surface) 100%
  );
}
```

この設計は正しく、変更の必要はない。

### 2-2. design-spec の3段階展開

design-spec §4-2 は各キャラカラーから dim(10%)・mid(25%)・vivid(100%) の3段階を生成することを求めている。

```css
/* 推奨: コンポーネント内で自動派生 */
.character-card,
.mini-rank-card,
.live-expert-card,
.rank-row,
[data-char-color] {
  --char-vivid: var(--accent);
  --char-mid:   color-mix(in oklch, var(--accent), transparent 75%);
  --char-dim:   color-mix(in oklch, var(--accent), transparent 90%);
}
```

**oklch vs srgb の選択**: 現行は `color-mix(in srgb, ...)` を使用している。oklch はより知覚均一（10色の dim が同じ明るさに見える）だが、srgb でも実用上の問題は小さい。統一さえしていれば OK。ブラウザサポートは oklch も Baseline 2023 で十分。

### 2-3. :root 定義 vs インラインスタイル

| 方式 | メリット | デメリット | 推奨場面 |
|---|---|---|---|
| `:root` に10人分定義 | CSS だけで完結、IDEの補完が効く | 要素とカラーの紐付けに別のクラスが必要 | 静的なスタイル（ゲートストライプ等） |
| インラインスタイルで注入 | JS のデータから動的生成、1箇所の管理 | CSS だけでは色が見えない | キャラカードやランキング行（現行方式） |
| `data-*` 属性 + CSS | セマンティック、CSS でマッチ可能 | 10人分のルールが必要 | 将来の拡張（`[data-seat="01"]`） |

**k-ba-man の推奨**: 現行のインラインスタイル方式（`style="--accent: ..."`）を継続。理由:
1. JS 側にキャラクターデータの色定義がある
2. カードの動的生成と自然に統合できる
3. 10人分の `:root` 定義は冗長

補助として、ゲートストライプの10色は `:root` に定義してもよい（静的要素のため）。

```css
:root {
  /* ゲートストライプ用 */
  --gate-01: #7f1d1d;
  --gate-02: #0f766e;
  --gate-03: #6d28d9;
  /* ... */
}
```

---

## 3. CSS ファイル構成

### 3-1. 単一ファイル vs 分割

| 方式 | メリット | デメリット |
|---|---|---|
| **単一 styles.css（現行）** | HTTPリクエスト1回、依存関係なし、Critical CSS 抽出が楽 | 2780行は探索しにくい、チーム開発時に衝突しやすい |
| **@import 分割** | 論理的な整理、ファイル単位の見通し | HTTP/1.1 では直列読み込み、Critical CSS と競合しうる |
| **@layer + @import** | カスケード制御と分割の両立、最新ベストプラクティス | 現行からの移行コスト |
| **`<link>` タグで複数読み込み** | 並列読み込み可能 | HTML 側の管理が必要 |

**k-ba-man の推奨: 単一ファイル継続 + セクションコメントの改善**

理由:
1. ビルドツールなし → `@import` の直列読み込みリスク（HTTP/2 前提でも DNS 解決やファイル数のオーバーヘッド）
2. 1人開発 → ファイル分割のチーム衝突メリットがない
3. 2780行は大きいが、現行のセクションコメント（`/* === TOKENS === */` 等）で十分にナビゲート可能
4. Critical CSS のインライン化は、単一ファイルからの手動抽出が最もシンプル

### 3-2. @import を使う場合の注意

もし将来分割する場合:

```css
/* styles.css（エントリポイント） */
@import url('tokens.css');
@import url('reset.css');
@import url('layout.css');
@import url('components.css');
@import url('pages.css');
@import url('responsive.css');
```

- HTTP/2 環境でも、CSS `@import` はパーサーブロッキング（前のファイルを解析しないと次の `@import` を発見できない）
- `<link>` タグでの並列読み込みのほうがパフォーマンス上有利
- ただし、k-ba-man は静的サイトで CSS 総量が小さい（~80KB gzip前）ため、実測でボトルネックにならない可能性も高い

### 3-3. CSS Cascade Layers（@layer）の活用余地

`@layer` はカスケード順序を明示的に制御する機能（Baseline 2022、94%+ サポート）。

```css
@layer reset, tokens, base, layout, components, utilities;

@layer reset {
  *, *::before, *::after { box-sizing: border-box; }
  /* ... */
}

@layer tokens {
  :root {
    --bg: #0b0c11;
    /* ... */
  }
}

@layer components {
  .character-card { /* ... */ }
  .rank-row { /* ... */ }
}
```

**k-ba-man での判断**: 現行の specificity 問題（`!important` 乱用や詳細度の衝突）がないなら、`@layer` 導入は投資対効果が低い。現行 CSS は specificity が概ね制御されている（クラスベース、IDセレクタなし）ため、**導入不要**。

### 3-4. Critical CSS との整合

design-spec §4-7 は「ファーストビュー（ヘッダー + ヒーロー）の CSS を `<style>` でインライン化」を求めている。

```html
<head>
  <!-- Critical CSS: ヘッダー + ヒーロー -->
  <style>
    :root { /* トークンの最小セット */ }
    .site-header { /* ... */ }
    .hero-band { /* ... */ }
    /* ファーストビューに必要な最小限 */
  </style>
  <!-- 残りは非同期ロード -->
  <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="styles.css"></noscript>
</head>
```

単一 styles.css からの手動抽出手順:
1. `:root`（トークン全体）— 他のどの宣言も参照するため全体をインライン化
2. リセット（`*`, `body`, `img`, `a`）
3. `.site-header` 関連（ヘッダー〜ナビ）
4. `.hero-band` 関連（ヒーロー）
5. `.button`（ヒーロー CTA）
6. タイポグラフィの基本（`h1`, `h2`, `.eyebrow`, `.lead`）
7. これ以外はすべて styles.css に残す

---

## 4. レスポンシブトークン

### 4-1. clamp() でブレイクポイントを不要にできるケース

| プロパティ | clamp() で十分 | メディアクエリが必要 |
|---|---|---|
| フォントサイズ | ✅ 見出し・本文の流体サイズ | — |
| セクション間余白 | ✅ `clamp(48px, 8vw, 96px)` | — |
| ブロック間余白 | ✅ `clamp(24px, 4vw, 40px)` | — |
| ページ左右パディング | ✅ `clamp(16px, 4vw, 40px)` | — |
| グリッドカラム数 | — | ✅ 5列→3列→1列は離散的変化 |
| レイアウト構造 | — | ✅ 2カラム→1カラム |
| ナビゲーション形式 | — | ✅ 横ナビ→タブバー |
| 表示/非表示 | — | ✅ `display: none` の切り替え |
| コンポーネント内部レイアウト | △ 場合による | ✅ グリッドテンプレートの変更 |

**原則**: 「値が連続的に変化する」→ clamp()。「構造が離散的に切り替わる」→ メディアクエリ。

### 4-2. 余白トークンの clamp() 定義

```css
:root {
  /* 3段階の余白トークン（design-spec §4-4 準拠） */
  --space-lg: clamp(48px, 8vw, 96px);   /* セクション間 */
  --space-md: clamp(24px, 4vw, 40px);   /* ブロック間 */
  --space-sm: 10px;                      /* カード間ガター（固定） */
  --space-page: clamp(16px, 4vw, 40px); /* ページ左右パディング */
}
```

### 4-3. コンテナクエリの活用余地

CSS Container Queries は 2026 年時点で 95%+ サポート。

k-ba-man での候補:
- **キャラカード**: 一覧（狭い）/ ヒーロー横（広い）で同じコンポーネントのレイアウトを変える → ✅ 適合
- **stat-tile**: summary-strip（4列）/ race-card 内（小さい）で同じタイルのフォントサイズを変える → ✅ 適合
- **ランキング行**: サイドバー vs メインエリアで表示列数を変える → △ 現状サイドバーがないので不要

**判断**: 現時点では「あれば便利」レベル。キャラカードの再利用性が高まるフェーズで導入を検討。初期リニューアルではメディアクエリで十分。

---

## 5. クラス設計方針

### 5-1. BEM vs CUBE CSS vs 独自

| 方法論 | 特徴 | k-ba-man との相性 |
|---|---|---|
| **BEM** | ブロック__要素--修飾子。厳密な命名、長いクラス名 | ❌ 1人開発には冗長。`.rank-row__metric--highlighted` は読みにくい |
| **CUBE CSS** | Composition, Utility, Block, Exception。カスケードを活用 | ⭕ フレームワーク不使用・カスケード活用の現行スタイルと親和性が高い |
| **独自（現行）** | セマンティックなクラス名、フラット構造 | ⭕ 現行で機能している。`.rank-row`, `.stat-tile`, `.character-card` は明快 |

### 5-2. 現行スタイルの分析

現行 CSS は無意識に CUBE CSS に近い構造をしている:
- **Composition（構成）**: `.content-band`, `.two-column`, `.hero-band` → レイアウトの骨格
- **Block（ブロック）**: `.character-card`, `.rank-row`, `.live-expert-card` → UIコンポーネント
- **Exception（例外）**: `.is-active`, `.is-selected`, `.is-current` → 状態変化
- **Utility（ユーティリティ）**: ほぼなし（`.lead`, `.eyebrow` が近い）

### 5-3. 推奨: 現行方針の継続 + 最小限のルール化

1. **レイアウト系クラス**: ハイフン区切り、名詞的（`.content-band`, `.summary-strip`, `.character-grid`）
2. **コンポーネント系クラス**: ハイフン区切り、名詞的（`.character-card`, `.rank-row`, `.stat-tile`）
3. **子要素**: コンポーネント名をプレフィクスに（`.card-media`, `.card-copy`, `.rank-person`, `.rank-metric`）
4. **状態**: `is-` プレフィクス（`.is-active`, `.is-selected`, `.is-current`）
5. **ユーティリティ**: 最小限に留める。`.lead`, `.eyebrow`, `.notice` 程度
6. **JavaScript フック**: クラスではなく `data-*` 属性を使う（`data-phase="announce"`, `data-status="win"`）

```html
<!-- 推奨パターン -->
<div class="rank-row" style="--accent: #7f1d1d" data-status="relegation">
  <span class="rank-position">10</span>
  <div class="rank-person">...</div>
  <div class="rank-metric">...</div>
</div>
```

---

## 6. 現行 CSS からの移行ロードマップ

### P0: 即時対応（リニューアル作業と同時）

| 項目 | 現行 | 改善 |
|---|---|---|
| surface 番号統一 | `--surface` (1相当), `--surface-2`, `--surface-3` | `--surface-0`〜`--surface-3` の4段階に統一 |
| color-mix 色空間統一 | `in srgb` と生のカラーコードが混在 | `in oklch` に統一（または `in srgb` に統一） |
| キャラカラー3段階 | 個別に `color-mix()` を都度記述 | `--char-vivid`/`--char-mid`/`--char-dim` を共通定義 |
| 余白トークン | 各所で `clamp()` を直書き | `--space-lg`/`--space-md`/`--space-sm` トークン化 |

### P1: リニューアル中盤

| 項目 | 内容 |
|---|---|
| セマンティックカラー | `--color-hit-win`, `--color-hit-place`, `--color-miss` 等を `:root` に集約 |
| フォントサイズトークン | `--font-size-xs`〜`--font-size-2xl` のスケール定義 |
| Critical CSS 抽出 | ヘッダー + ヒーローの CSS を `<style>` にインライン化 |

### P2: 安定後

| 項目 | 内容 |
|---|---|
| コンテナクエリ | キャラカード・stat-tile に適用検討 |
| `@layer` | CSS が 3000行を超えた場合に導入検討 |
| CSS ファイル分割 | チーム開発になった場合に `<link>` タグでの分割を検討 |

---

## 7. 統合コード例: トークン定義の全体像

以下は、上記の提言をすべて反映した `:root` トークン定義の完成形イメージ。

```css
:root {
  color-scheme: dark;

  /* ────────────────────────────────────────────
     SURFACE: 4段階デプスシステム（design-spec §4-2）
     ──────────────────────────────────────────── */
  --surface-0: #0b0c11;   /* 最奥の背景 */
  --surface-1: #111319;   /* カード・パネル */
  --surface-2: #181a24;   /* 内部ブロック */
  --surface-3: #20222e;   /* 最前面・ホバー */

  /* ────────────────────────────────────────────
     TEXT: テキスト4段階
     ──────────────────────────────────────────── */
  --ink:    #edeae0;       /* 見出し・強調 */
  --text:   #a8a59c;       /* 本文 */
  --muted:  #62647a;       /* メタ情報 ※AA確保要検討 */
  --faint:  #3a3b4e;       /* 装飾的ボーダー・微弱テキスト */

  /* ────────────────────────────────────────────
     BORDER: 境界線2段階
     ──────────────────────────────────────────── */
  --border:     #1c1e2c;
  --border-mid: #252738;

  /* ────────────────────────────────────────────
     ACCENT: ゴールド（ブランドカラー）
     ──────────────────────────────────────────── */
  --gold:       #c9a840;
  --gold-light: #dfc060;
  --gold-dim:   oklch(from #c9a840 l c h / 0.10);
  --gold-glow:  oklch(from #c9a840 l c h / 0.18);

  /* ────────────────────────────────────────────
     SEMANTIC: 成績判定（design-spec §4-2）
     ──────────────────────────────────────────── */
  --color-hit-win:    var(--gold);       /* 的中（gold系） */
  --color-hit-place:  #818cf8;           /* 3着内（藍系） */
  --color-miss:       #be3636;           /* 外れ（赤系） */
  --color-rank-up:    #22c55e;           /* 上昇（緑系） */
  --color-rank-down:  #f97316;           /* 下降（橙系） */

  /* ────────────────────────────────────────────
     SPACE: 3段階余白（design-spec §4-4）
     ──────────────────────────────────────────── */
  --space-lg:   clamp(48px, 8vw, 96px);  /* セクション間 */
  --space-md:   clamp(24px, 4vw, 40px);  /* ブロック間 */
  --space-sm:   10px;                     /* カード間ガター */
  --space-page: clamp(16px, 4vw, 40px);  /* ページ左右 */

  /* ────────────────────────────────────────────
     RADIUS / SHADOW / MAX-WIDTH
     ──────────────────────────────────────────── */
  --radius:    3px;
  --radius-md: 6px;
  --max:       1180px;
  --shadow:    0 24px 64px rgba(0, 0, 0, 0.55);

  /* ────────────────────────────────────────────
     FONT STACKS
     ──────────────────────────────────────────── */
  --f-serif: 'Shippori Mincho B1', 'Noto Serif JP', 'Yu Mincho', serif;
  --f-sans:  'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', system-ui, sans-serif;
  --f-mono:  'JetBrains Mono', 'Menlo', 'Consolas', monospace;

  font-family: var(--f-sans);
  font-size: 16px;
  line-height: 1.65;
}

/* ────────────────────────────────────────────
   CHARACTER COLOR: 動的3段階展開
   任意の --accent を受け取り、3段階を自動派生
   ──────────────────────────────────────────── */
[style*="--accent"] {
  --char-vivid: var(--accent);
  --char-mid:   color-mix(in oklch, var(--accent) 25%, transparent);
  --char-dim:   color-mix(in oklch, var(--accent) 10%, transparent);
}
```

---

## 参考リンク

- [CSS Variables Guide: Design Tokens & Theming | FrontendTools](https://www.frontendtools.tech/blog/css-variables-guide-design-tokens-theming-2025)
- [The developer's guide to design tokens and CSS variables | Penpot](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)
- [Naming Tokens in Design Systems | Nathan Curtis / EightShapes](https://medium.com/eightshapes-llc/naming-tokens-in-design-systems-9e86c7444676)
- [Design Token Naming Conventions: A Practical Guide | Always Twisted](https://www.alwaystwisted.com/articles/design-token-naming-conventions)
- [Best Practices For Naming Design Tokens | Smashing Magazine](https://www.smashingmagazine.com/2024/05/naming-best-practices/)
- [CUBE CSS](https://cube.fyi/)
- [Organizing Design System Component Patterns With CSS Cascade Layers | CSS-Tricks](https://css-tricks.com/organizing-design-system-component-patterns-with-css-cascade-layers/)
- [Integrating CSS Cascade Layers To An Existing Project | Smashing Magazine](https://www.smashingmagazine.com/2025/09/integrating-css-cascade-layers-existing-project/)
- [Container queries in 2026 | LogRocket Blog](https://blog.logrocket.com/container-queries-2026/)
- [Clamp CSS in 2025 | DEV Community](https://dev.to/danilo1/clamp-css-in-2025-why-i-stopped-writing-media-queries-for-small-tweaks-7fk)
- [Rethinking modular CSS and build-free design systems | Go Make Things](https://gomakethings.com/rethinking-modular-css-and-build-free-design-systems)
- [Creating color palettes with the CSS color-mix() function | MDN Blog](https://developer.mozilla.org/en-US/blog/color-palettes-css-color-mix/)
- [CSS color-mix() for Dynamic Theming | EdgeCases](https://www.edge-cases.com/css/css-color-mix-dynamic-theming)
