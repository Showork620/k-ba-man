# カラーシステム調査レポート

design-spec.md §4-2 を実現するために必要な CSS カラー技術と設計パターンの調査結果。

---

## 1. color-mix() によるキャラカラー3段階展開

### 仕様の要件

> 各キャラカラーから dim(10%)・mid(25%)・vivid(100%) の3段階を `color-mix()` 等で生成し、用途を統一

### ブラウザ対応状況（2026年6月時点）

`color-mix()` は2023年中頃から全モダンブラウザで安定サポート（Baseline Widely Available）。Chrome 111+, Firefox 113+, Safari 16.2+ で利用可能。安心して本番投入できる。

### 実装パターン: color-mix() によるアクセントカラー展開

```css
/* 各キャラクターカラーを CSS custom property で定義 */
:root {
  --char-tatsunosuke: oklch(0.40 0.12 25);   /* 龍之介: 深紅系 */
  --char-makoto:      oklch(0.52 0.10 175);  /* 誠: ティール */
  --char-misaki:      oklch(0.44 0.20 285);  /* 美咲: 紫 */
  --char-kenta:       oklch(0.52 0.14 145);  /* 健太: 緑 */
  --char-teppei:      oklch(0.52 0.12 75);   /* 鉄平: 琥珀 */
  --char-sakura:      oklch(0.50 0.18 10);   /* さくら: クリムゾン */
  --char-aoi:         oklch(0.48 0.18 260);  /* 葵: 青 */
  --char-hina:        oklch(0.58 0.16 45);   /* 陽菜: オレンジ */
  --char-yuko:        oklch(0.50 0.12 160);  /* 優子: エメラルド */
  --char-goro:        oklch(0.48 0.10 70);   /* 吾郎: 褐色 */
}

/* 3段階の展開テンプレート — 任意の --char-* に適用可能 */
.character-card {
  /* vivid: そのままのキャラカラー（100%）。バッジ・アイコン背景 */
  --accent-vivid: var(--char-color);

  /* mid: 黒と 25:75 で混合。ボーダー・ホバー背景 */
  --accent-mid: color-mix(in oklch, var(--char-color) 25%, black);

  /* dim: 黒と 10:90 で混合。カード背景のティント */
  --accent-dim: color-mix(in oklch, var(--char-color) 10%, black);
}
```

**なぜ oklch 空間で混合するか**: `color-mix(in oklch, ...)` は知覚的に均一な明度変化を生む。sRGB 空間で混合すると、色相によって暗くなりすぎたり彩度が不自然に落ちたりする。oklch なら10人全員のカラーが同じ視覚的強度で dim/mid になる。

### 代替手法: CSS Relative Color Syntax（RCS）

ブラウザ対応率89.6%（2026年2月時点）。Chrome 119+, Firefox 128+, Safari 17.2+ で動作。

```css
/* Relative Color Syntax による明度操作 */
.character-card {
  --accent-vivid: var(--char-color);
  --accent-mid:   oklch(from var(--char-color) calc(l * 0.4) c h);
  --accent-dim:   oklch(from var(--char-color) calc(l * 0.2) c h);
}
```

RCS は `calc()` で明度・彩度・色相を個別に制御できるため、より柔軟。ただし Firefox 128 未満（2024年7月以前）が未対応のため、`color-mix()` のほうが安全マージンが広い。**本プロジェクトでは `color-mix()` を主軸とし、RCS は将来のホバーエフェクト等で補助的に使う**のが現実的。

### 実装時の注意

- `color-mix()` の第一引数は色空間の指定が必須: `in oklch` / `in srgb` 等
- パーセンテージは「第一色の割合」。`color-mix(in oklch, red 25%, black)` = 赤25% + 黒75%
- CSS custom property に oklch() 値を入れる場合、var() 参照先が有効な `<color>` であれば `color-mix()` に渡せる
- hex値（`#7f1d1d` 等）も `color-mix()` に直接渡せる。ブラウザが内部的に oklch へ変換して混合する

---

## 2. ダークテーマの背景色: 「純黒ではない暗色」の作り方

### 仕様の要件

> 背景色はニュートラルな暗色（純黒ではなく、微かに色味を帯びた暗色）

### なぜ純黒（#000000）を避けるか

1. **OLED スミアリング**: 有機ELディスプレイでは #000000 のピクセルが物理的にオフになる。スクロール時にピクセルの再点灯が遅れ、「にじみ（smearing）」が起きる
2. **深度表現の喪失**: 純黒の上にはシャドウを落とせない。elevation（浮き）の表現が不可能になる
3. **ハレーション**: 純黒と純白のコントラストが強すぎ、白文字が背景ににじんで見える（特にディスレクシアのユーザーに顕著）
4. **Material Design 3 の知見**: Google は #121212 相当のダークグレーを推奨し、elevation に応じて surface を明るくする手法を採用

### oklch での色味を帯びた暗色の定義

```css
:root {
  /* 
   * L (明度): 0.10〜0.14 の範囲がダークテーマ背景に適切
   * C (彩度): 0.005〜0.015 でかすかに色味を載せる（0だと完全ニュートラル）
   * H (色相): 背景の性格に合わせて変える
   *
   * 現行値 #0b0c11 ≒ oklch(0.11 0.01 270) — 青紫のかすかなティント。良い選択。
   */
  --bg: oklch(0.11 0.008 270);  /* わずかに青みのある暗色 */
}
```

### ページ性格による色温度の使い分け

仕様書に「ページの性格によって色温度を変えてもよい」とあるため:

```css
/* 例: ページごとの背景ティント */
:root {
  --bg-hue-cool: 270;    /* 成績・ランキング — 冷静な青紫 */
  --bg-hue-warm: 40;     /* ライブ予想 — 競馬場の温かさ */
  --bg-hue-neutral: 250; /* Overview — ニュートラル寄り */
}

/* 各ページの背景色 */
.page-results   { --bg: oklch(0.11 0.008 var(--bg-hue-cool)); }
.page-live      { --bg: oklch(0.11 0.008 var(--bg-hue-warm)); }
.page-overview  { --bg: oklch(0.11 0.006 var(--bg-hue-neutral)); }
```

**注意**: oklch() は 2026年時点で `var()` による個別チャネルの差し込みに非対応。上記は概念図であり、実装時は各ページに完全な oklch() 値を書くか、JS で `style.setProperty()` する必要がある。

### 現行実装との比較

| トークン | 現行値（hex） | oklch 近似 | 備考 |
|---|---|---|---|
| --bg | #0b0c11 | oklch(0.11 0.01 270) | 青紫ティント。仕様に合致 |
| --surface | #111319 | oklch(0.14 0.01 265) | 良好 |
| --surface-2 | #181a24 | oklch(0.17 0.01 268) | 良好 |
| --surface-3 | #20222e | oklch(0.20 0.01 266) | 良好 |

現行の背景色はすでに「微かに青紫を帯びた暗色」で、方向性は正しい。oklch への移行は段階的に行える。

---

## 3. 10人のキャラカラー識別性

### 仕様の要件

> 10人並べたとき「全員違う色」が一目で分かること

### 色相の配分戦略

10色を oklch 色相環（0〜360°）に均等配置すると各色の間隔は36°だが、人間の色覚は色相によって弁別能力が異なる（青〜紫は近い色でも区別しやすく、緑〜黄は区別しにくい）。

**推奨アプローチ: 知覚均等ではなく「アンカー + 充填」**

1. まず3つの強いアンカーカラーを選ぶ（赤系・青系・緑系 — 3原色方向）
2. 次に3つのセカンダリ色相を埋める（紫・オレンジ・ティール）
3. 残り4色を隙間に配置し、明度・彩度で差をつける

### 現行10色の色相分析と問題点

| キャラ | 現行 hex | 推定色相 | 問題点 |
|---|---|---|---|
| 龍之介 | #7f1d1d | 赤 0° | — |
| 誠 | #0f766e | ティール 175° | — |
| 美咲 | #6d28d9 | 紫 260° | — |
| 健太 | #15803d | 緑 145° | **優子 #047857 と近い** |
| 鉄平 | #a16207 | 琥珀 40° | **吾郎 #854d0e と近い** |
| さくら | #be123c | クリムゾン 345° | 龍之介の赤と近め |
| 葵 | #1d4ed8 | 青 230° | — |
| 陽菜 | #ea580c | オレンジ 25° | 鉄平の琥珀と近め |
| 優子 | #047857 | エメラルド 160° | 健太の緑と近い |
| 吾郎 | #854d0e | 褐色 35° | 鉄平・陽菜と渋滞 |

**課題**: 緑2色（健太・優子）と暖色3色（鉄平・陽菜・吾郎）がそれぞれ色相が近すぎる。

### 改善の方向性

- **健太 vs 優子**: 健太の緑をより黄緑（H:125°）方向に、優子をより青緑（H:170°）方向にずらす
- **鉄平 vs 陽菜 vs 吾郎**: 鉄平の琥珀（H:60°）・陽菜のオレンジ（H:35°）・吾郎の褐色（H:80°）を広げる。吾郎をオリーブ〜カーキ方向（H:100°前後）に移すと三者の距離が取れる
- **ダークテーマの利点**: 暗い背景では明るい色同士の弁別性が高い。ダークUIは10色を並べるのに有利

### 色覚多様性への配慮

- 色だけでなく、各キャラに象徴アイコン（仕様にある巻物・タブレット等）を付けることで、色覚特性のあるユーザーも識別可能にする
- oklch の彩度（C）を使い、似た色相でも「鮮やか vs くすんだ」の差を付ける
- テスト: Adobe Color の色覚シミュレーター（P型・D型・T型）で10色を検証する

---

## 4. セマンティックカラーとキャラカラーの干渉回避

### 仕様の要件

> 的中(gold系)・3着内(紫/藍系)・外れ(赤系)・上昇(緑系)・下降(橙系) は全ページで統一

### 問題: キャラカラーとの衝突

| セマンティック | 色系統 | 衝突リスクのあるキャラ |
|---|---|---|
| 的中 | gold/琥珀 | 鉄平(琥珀)・吾郎(褐色) |
| 3着内 | 紫/藍 | 美咲(紫)・葵(青) |
| 外れ | 赤 | 龍之介(赤)・さくら(クリムゾン) |
| 上昇 | 緑 | 健太(緑)・優子(エメラルド) |
| 下降 | 橙 | 陽菜(オレンジ) |

**すべてのセマンティックカラーに衝突の可能性がある。**

### 解決策: トークン階層の分離

IBM Carbon や Atlassian のデザインシステムが採用する「3層トークン」アーキテクチャ:

```
Primitive (原色) → Semantic (意味) → Component (用途)
```

```css
:root {
  /* === Primitive: 生の色値 === */
  --p-gold:     oklch(0.75 0.14 85);
  --p-indigo:   oklch(0.55 0.15 280);
  --p-red:      oklch(0.55 0.18 25);
  --p-green:    oklch(0.60 0.14 150);
  --p-orange:   oklch(0.62 0.14 55);

  /* === Semantic: 文脈での意味 === */
  --status-win:    var(--p-gold);     /* 的中 */
  --status-place:  var(--p-indigo);   /* 3着内 */
  --status-out:    var(--p-red);      /* 外れ */
  --status-up:     var(--p-green);    /* 上昇 */
  --status-down:   var(--p-orange);   /* 下降 */

  /* === Character: キャラ固有色 === */
  --char-tatsunosuke: oklch(0.40 0.12 25);
  --char-sakura:      oklch(0.50 0.18 10);
  /* ... */
}
```

### 干渉回避の3つのルール

1. **用途で分ける**: キャラカラーは「そのキャラの所有物」（バッジ、ボーダー、背景ティント）にのみ使い、ステータス表示には使わない。ステータスカラーは「結果の種類」（pill バッジ、矢印、グロー）にのみ使う

2. **明度で分ける**: セマンティックカラーはキャラカラーより高い明度（L: 0.65〜0.80）で定義し、キャラカラーはやや暗め（L: 0.40〜0.55）にする。同じ赤系でも明度差があれば読み違えない

3. **形状で分ける**: ステータスは常に pill 型バッジ（角丸小・固定幅）、キャラの所属表示は円形バッジ（席番号）。形状が違えば色が近くても意味を誤読しない

```css
/* ステータス pill — キャラカラーとは完全に別の文脈 */
.status-pill--win   { background: var(--status-win);   color: var(--bg); }
.status-pill--place { background: var(--status-place); color: white; }
.status-pill--out   { background: var(--status-out);   color: white; }

/* キャラ席番バッジ — キャラカラーの文脈 */
.seat-badge { background: var(--char-color); color: white; border-radius: 50%; }
```

---

## 5. Surface デプスシステム（4段階）

### 仕様の要件

> 要素の階層を surface-0（最奥の背景）→ surface-1 → surface-2 → surface-3（最前面カード）の4段階以内で管理

### Material Design 3 の知見: ダークテーマの elevation

Material Design 3 では、ダークテーマの elevation を「明るさの増加」で表現する。影（シャドウ）は暗い背景の上では見えないため、**surface が高くなるほど明るくなる**のが鉄則。

MD3 ではプライマリカラーのティントを elevation に応じて混ぜる手法（tonal elevation）を採用している。

### CSS Custom Properties による4段階実装

```css
:root {
  /* Base hue for surface tinting */
  --surface-tint: oklch(0.60 0.10 270);  /* プライマリカラー（or 背景の色味） */

  /* 4段階の surface — 上に行くほど明るい */
  --surface-0: oklch(0.11 0.008 270);    /* 最奥の背景。body に使う */
  --surface-1: oklch(0.14 0.010 270);    /* セクションの囲み、ナビバー */
  --surface-2: oklch(0.18 0.012 268);    /* カード、パネル */
  --surface-3: oklch(0.22 0.014 266);    /* 最前面。モーダル、ドロップダウン、ホバー状態のカード */

  /* 対応するボーダー色 — surface より少し明るい */
  --border-0: oklch(0.16 0.008 270);
  --border-1: oklch(0.20 0.010 268);
  --border-2: oklch(0.24 0.012 266);
}
```

### 明度のステップ設計

| 段階 | 役割 | 明度 (L) | 明度差 | 用途例 |
|---|---|---|---|---|
| surface-0 | 最奥の背景 | 0.11 | — | body, page background |
| surface-1 | 囲み・コンテナ | 0.14 | +0.03 | nav, section wrapper |
| surface-2 | カード・パネル | 0.18 | +0.04 | character card, stats panel |
| surface-3 | 最前面 | 0.22 | +0.04 | modal, tooltip, hover card |

**ステップが上がるほど差を大きくする**（0.03 → 0.04 → 0.04）。最下層は微差で重ねが柔らかく、上層ほど明確に浮く。

### color-mix() でティントを載せる応用

Material Design 3 のように、elevation に応じてプライマリカラーのティントを混ぜることもできる:

```css
:root {
  --primary: oklch(0.65 0.15 270);

  --surface-0: oklch(0.11 0.008 270);
  --surface-1: color-mix(in oklch, var(--primary) 5%, var(--surface-0));
  --surface-2: color-mix(in oklch, var(--primary) 8%, var(--surface-0));
  --surface-3: color-mix(in oklch, var(--primary) 12%, var(--surface-0));
}
```

この手法はプライマリカラーを1つ変えるだけで全 surface のトーンが連動して変わるため、テーマの一貫性が高い。

### シャドウとの組み合わせ

仕様に「控えめなシャドウ（色付きグローよりドロップシャドウ寄り）」とあるため:

```css
/* ダークテーマではシャドウの不透明度を高めに */
:root {
  --shadow-sm: 0 1px 3px oklch(0 0 0 / 0.4);
  --shadow-md: 0 4px 16px oklch(0 0 0 / 0.45);
  --shadow-lg: 0 12px 48px oklch(0 0 0 / 0.55);
}

/* surface-2 以上にシャドウを付加 */
.card      { background: var(--surface-2); box-shadow: var(--shadow-sm); }
.modal     { background: var(--surface-3); box-shadow: var(--shadow-lg); }
```

ダークテーマではシャドウは「明度差による浮き」の補助。シャドウ単独では階層が見えにくいため、surface の明度差が主、シャドウは副。

---

## 6. 実装ロードマップへの提言

### Phase 1: トークン移行（現行 hex → oklch）

1. 現行の `--bg`, `--surface`, `--surface-2`, `--surface-3` を oklch 値に書き換える（見た目はほぼ変わらない）
2. 10人のキャラカラーを oklch で再定義し、色相の偏りを調整
3. `color-mix()` で dim/mid/vivid の3段階を生成するユーティリティを `:root` に追加

### Phase 2: セマンティックトークンの導入

1. `--status-win`, `--status-place`, `--status-out`, `--status-up`, `--status-down` を定義
2. キャラカラーとセマンティックカラーの用途分離を CSS クラスで徹底

### Phase 3: キャラカラーの動的適用

1. JS 側で `element.style.setProperty('--char-color', character.color)` し、CSS 側は `var(--char-color)` を参照するだけにする
2. `color-mix(in oklch, var(--char-color) 10%, var(--surface-0))` でキャラ固有の背景ティントを自動生成

---

## Sources

- [MDN: Creating color palettes with CSS color-mix()](https://developer.mozilla.org/en-US/blog/color-palettes-css-color-mix/)
- [MDN: color-mix() CSS function](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)
- [MDN: Using relative colors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_colors/Relative_colors)
- [MDN: oklch() CSS function](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch)
- [Evil Martians: OKLCH in CSS — why we moved from RGB and HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)
- [Smashing Magazine: Simplify Your Color Palette With CSS Color-Mix()](https://www.smashingmagazine.com/2022/06/simplify-color-palette-css-color-mix/)
- [Chrome for Developers: CSS relative color syntax](https://developer.chrome.com/blog/css-relative-color-syntax)
- [Una Kravets: Modern CSS theming](https://una.im/modern-css-theming/)
- [Material Design 3: Elevation](https://m3.material.io/styles/elevation/applying-elevation)
- [Material Design 3: Dark theme tutorial](https://m3.material.io/blog/dark-theme-design-tutorial-video)
- [Damian Walsh: Dynamic colour palettes with OKLCH](https://damianwalsh.co.uk/posts/dynamic-colour-palettes-with-oklch-and-css-custom-properties/)
- [Manuel Strehl: Easy Theming with OKLCH colors](https://manuel-strehl.de/easy_theming_with_oklch)
- [Muz.li: Dark Mode Design Systems Guide](https://muz.li/blog/dark-mode-design-systems-a-complete-guide-to-patterns-tokens-and-hierarchy/)
- [designsystems.surf: Elevation Design Patterns](https://designsystems.surf/articles/depth-with-purpose-how-elevation-adds-realism-and-hierarchy)
- [NateBal: Best Practices for Dark Mode 2026](https://natebal.com/best-practices-for-dark-mode/)
- [colorpick.app: Modern CSS Color Functions 2026](https://www.colorpick.app/blog/css-color-functions-2026-guide)
- [Carbon Design: Color palettes and accessibility](https://medium.com/carbondesign/color-palettes-and-accessibility-features-for-data-visualization-7869f4874fca)
- [Piccalilli: A pragmatic guide to modern CSS colours](https://piccalil.li/blog/a-pragmatic-guide-to-modern-css-colours-part-two/)
- [urre.me: Darken or Lighten with CSS color-mix() and oklch()](https://urre.me/writing/darken-or-lighten-with-css/)
