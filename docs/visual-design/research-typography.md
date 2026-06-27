# タイポグラフィ調査レポート

design-spec.md §4-3 を実現するための技術知見。現行実装（`site/styles.css`）の評価と改善提案を含む。

---

## 1. 現行実装の評価

```css
/* 現行のフォントスタック */
--f-serif: 'Shippori Mincho B1', 'Noto Serif JP', 'Yu Mincho', 'HiraMinProN-W3', serif;
--f-sans:  'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', system-ui, sans-serif;
--f-mono:  'JetBrains Mono', 'Menlo', 'Consolas', monospace;
```

**良い点**: 3書体のロール分担（serif=見出し、sans=本文、mono=数値）が design-spec の要件と合致。Shippori Mincho B1 は「和紙のテクスチャ」キーワードと親和性が高い。

**改善すべき点**:
- `font-display: swap` 未指定（Google Fonts URL にデフォルト `swap` が含まれるが、明示的な CLS 対策なし）
- `font-variant-numeric: tabular-nums` 未指定（数値の等幅揃えなし）
- ダークテーマでの `-webkit-font-smoothing: antialiased` 未指定
- タイプスケール（見出しサイズ体系）が未定義
- `letter-spacing` の体系的な設定なし

---

## 2. フォント選定

### 2-1. 明朝体（見出し用）: Shippori Mincho B1 ✓ 継続推奨

| フォント | 特徴 | k-ba-man との適合性 |
|---|---|---|
| **Shippori Mincho B1** | オールドスタイル明朝。筆の運びが柔らかく、ひらがなが狭め。和の雰囲気と温かみ | ◎ 「和紙のテクスチャ」「円卓の間」の世界観に最適。B1 は墨だまりのある肉太バリアントで、ダーク背景での視認性が通常版より高い |
| Noto Serif JP | ニュートラルな明朝。ウェイト豊富（200-900）。クセがなく汎用性高い | ○ フォールバックとして適切。メインにすると「品があるが個性不足」 |
| Zen Old Mincho | 古風な明朝。クラシカルで力強い | △ 「席を守る切迫」のトーンには合うが、ウェイトが少なく使いにくい |
| Hina Mincho | 手書き風の繊細な明朝 | × 繊細すぎてダーク背景で潰れる |

**判定**: Shippori Mincho B1 を継続。B1（墨だまりバリアント）はダーク背景でのコントラストが通常版より良好で、design-spec の世界観に一致。

#### 見出し用の推奨設定

```css
.heading-display {
  font-family: var(--f-serif);
  font-weight: 700;
  letter-spacing: 0.04em;   /* 明朝体は詰め気味だと窮屈。0.03-0.05em が推奨 */
  line-height: 1.3;         /* 見出しは行間を狭く */
}

.heading-section {
  font-family: var(--f-serif);
  font-weight: 400;
  letter-spacing: 0.06em;   /* 細ウェイトは広めの字間で品を出す */
  line-height: 1.4;
}
```

**ウェイトの使い分け**:
- `700`（Bold）: ヒーローのキャッチコピー、ページタイトル。インパクト重視
- `400`（Regular）: セクション見出し、キャラ名、座右の銘。エレガンス重視
- Light (300) は Shippori Mincho B1 には存在しないため不使用

### 2-2. ゴシック体（本文用）: Noto Sans JP ✓ 継続推奨

| フォント | 特徴 | 判定 |
|---|---|---|
| **Noto Sans JP** | 最高の可読性、ウェイト豊富（100-900）、全文字カバー | ◎ 本文の標準。迷う理由なし |
| BIZ UDPGothic | ユニバーサルデザイン準拠。字面が大きく読みやすい | ○ アクセシビリティ優先ならこちら。ただし UD ゴシック特有の「丸み」が世界観と合わない |
| M PLUS 1p | 丸みのあるモダンゴシック | × トーンが軽すぎる |

#### 本文の推奨設定

```css
body {
  font-family: var(--f-sans);
  font-size: 16px;           /* 現行維持。15px 以下はダークテーマで辛い */
  font-weight: 400;
  line-height: 1.7;          /* 現行 1.65 → 1.7 に微調整。日本語は 1.7-2.0 が推奨 */
  letter-spacing: 0.02em;    /* 微量の字間で可読性向上 */
}
```

### 2-3. 等幅フォント（数値用）: JetBrains Mono ✓ 継続推奨

JetBrains Mono は `tnum`（Tabular Figures）を OpenType feature として内蔵しており、`font-variant-numeric: tabular-nums` が効く。数値指標の桁揃えに最適。

---

## 3. 明朝 × ゴシック混植のバランス

### 3-1. タイプスケール

design-spec の世界観は「スポーツ×群像ドラマ」。劇的なサイズコントラストが必要だが、過剰にならない比率として **Perfect Fourth（1.333）** を推奨。

```
Step  Scale     px (base=16)  用途
────────────────────────────────────────────
  5   3.157     50.5px        ヒーロー見出し
  4   2.369     37.9px        ページタイトル
  3   1.777     28.4px        セクション見出し
  2   1.333     21.3px        サブセクション
  1   1.000     16.0px        本文
  0   0.750     12.0px        キャプション・ラベル
```

**CSS 実装**:

```css
:root {
  --type-base: 1rem;      /* 16px */
  --type-scale: 1.333;    /* Perfect Fourth */

  --type-xs:  calc(var(--type-base) * 0.75);                                          /* 12px */
  --type-sm:  var(--type-base);                                                        /* 16px */
  --type-md:  calc(var(--type-base) * var(--type-scale));                               /* 21.3px */
  --type-lg:  calc(var(--type-base) * var(--type-scale) * var(--type-scale));           /* 28.4px */
  --type-xl:  calc(var(--type-base) * var(--type-scale) * var(--type-scale) * var(--type-scale));  /* 37.9px */
  --type-2xl: calc(var(--type-base) * var(--type-scale) * var(--type-scale) * var(--type-scale) * var(--type-scale)); /* 50.5px */
}
```

### 3-2. 混植の黄金比ルール

明朝見出し × ゴシック本文で美しく見せるための原則:

1. **サイズ比**: 見出しは本文の 1.5倍以上離す（1段階飛ばし）。隣接スケールの明朝 21px + ゴシック 16px は近すぎて混植感が薄い
2. **ウェイトの対比**: 明朝 700 + ゴシック 400 のコントラストが最も読みやすい。明朝 400 の場合はサイズ差を大きくとる
3. **行間の差**: 見出し行間 1.2-1.4 vs 本文行間 1.7-1.8。行間差が書体差を補強する
4. **字間の差**: 明朝見出しは +0.04em、ゴシック本文は +0.02em。明朝の方が字間を広くとる

```css
/* 見出し（明朝） */
h1, h2 {
  font-family: var(--f-serif);
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.3;
}

h3, h4 {
  font-family: var(--f-serif);
  font-weight: 400;
  letter-spacing: 0.06em;
  line-height: 1.4;
}

/* 本文（ゴシック） */
p, li, td {
  font-family: var(--f-sans);
  font-weight: 400;
  letter-spacing: 0.02em;
  line-height: 1.7;
}
```

### 3-3. モバイルでのスケール調整

モバイル（≤620px）ではスケール比を Major Third（1.25）に抑え、見出しが大きくなりすぎるのを防ぐ。

```css
@media (max-width: 620px) {
  :root {
    --type-scale: 1.25;
  }
}
```

---

## 4. 等幅数値の実装

### 4-1. `font-variant-numeric: tabular-nums`

design-spec §3-3 の表示指標（Brier score, 的中率, 暫定スコア等）を桁揃えで表示するために必須。

```css
/* 数値全般 */
.stat-value,
.ranking-metric,
.score {
  font-family: var(--f-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1;  /* フォールバック用に両方指定 */
}
```

### 4-2. 日本語フォントとの組み合わせの注意点

- `font-variant-numeric` は数字にのみ影響。ひらがな・カタカナ・漢字には効果なし
- Noto Sans JP は `tnum` を内蔵しているため、`var(--f-sans)` のまま `tabular-nums` を効かせることも可能。ただし JetBrains Mono の方が数字のデザインが明瞭
- 混在テキスト（例: 「的中率 83.3%」）では、日本語部分はゴシック + 数値部分はモノの書き分けが CSS だけでは困難。`font-family: var(--f-mono)` を指定すると日本語はフォールバック（Noto Sans JP or system）で描画される

**実用的アプローチ**: 数値セルは `font-family: var(--f-mono)` で統一。ラベル部分は別要素に分離。

```html
<td class="metric">
  <span class="metric-label">Brier</span>
  <span class="metric-value">0.187</span>
</td>
```

```css
.metric-label { font-family: var(--f-sans); font-size: var(--type-xs); }
.metric-value { font-family: var(--f-mono); font-variant-numeric: tabular-nums; }
```

---

## 5. CLS 防止: フォールバックメトリクス調整

### 5-1. 問題

`font-display: swap` で Web フォント読み込み前にフォールバックフォントが表示されるが、両者のメトリクス（文字幅・アセンダ・ディセンダ）が異なるとレイアウトシフト（CLS）が発生する。

### 5-2. 解決策: `@font-face` でメトリクスオーバーライド

```css
/* Noto Sans JP のフォールバック（Hiragino Sans）のメトリクス調整 */
@font-face {
  font-family: 'Noto Sans JP Fallback';
  src: local('Hiragino Sans'), local('Hiragino Kaku Gothic ProN');
  size-adjust: 100%;          /* CJK は基本的に等幅なので大きな調整不要 */
  ascent-override: 88%;       /* Noto Sans JP の ascent に合わせる */
  descent-override: 22%;      /* Noto Sans JP の descent に合わせる */
  line-gap-override: 0%;
}

/* Shippori Mincho B1 のフォールバック（Yu Mincho）のメトリクス調整 */
@font-face {
  font-family: 'Shippori Fallback';
  src: local('Yu Mincho'), local('YuMincho');
  size-adjust: 97%;
  ascent-override: 90%;
  descent-override: 20%;
  line-gap-override: 0%;
}

:root {
  --f-serif: 'Shippori Mincho B1', 'Shippori Fallback', serif;
  --f-sans:  'Noto Sans JP', 'Noto Sans JP Fallback', 'Hiragino Sans', system-ui, sans-serif;
}
```

### 5-3. CJK フォント固有の注意点

- 日本語フォントはほぼ全角等幅のため、`size-adjust` の調整幅はラテン文字フォントより小さい
- ただし CJK フォントはファイルサイズが巨大（3-20MB）。Google Fonts は `unicode-range` でサブセット分割するが、初期読み込みが遅いため CLS 対策は特に重要
- **実測が必要**: 上記の数値は参考値。実際のフォントファイルのメトリクスを [Fontaine](https://github.com/unjs/fontaine) 等で計測し、正確な値を算出するべき

### 5-4. `<link rel="preload">` との併用

```html
<!-- ヒーロー見出しで使う Shippori Mincho B1 Bold のプリロード -->
<link rel="preload"
      href="https://fonts.gstatic.com/s/shipporiminchob1/v21/..."
      as="font"
      type="font/woff2"
      crossorigin>
```

Google Fonts の CSS 内の実際の woff2 URL は変動するため、`<link rel="preconnect">` を推奨:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

---

## 6. ダークテーマでの日本語テキスト可読性

### 6-1. 光のにじみ（Überstrahlung）問題

ダーク背景に明るいテキストを表示すると、文字が実際より太く見える現象（光のにじみ / blooming）が起こる。特に日本語は画数が多いため、漢字の細部が潰れやすい。

### 6-2. アンチエイリアシング設定

```css
body {
  -webkit-font-smoothing: antialiased;      /* macOS: サブピクセルレンダリングを抑制 */
  -moz-osx-font-smoothing: grayscale;       /* Firefox macOS 用 */
  text-rendering: optimizeLegibility;        /* カーニング・リガチャを有効化 */
}
```

**注意**: `-webkit-font-smoothing` は macOS 限定。Windows/Linux では効果なし。Windows では ClearType がデフォルトで動作。

### 6-3. ウェイト補正

ダークテーマでは文字が太く見えるため、ライトテーマより **1段階細いウェイト** を選ぶと自然に見える。

| 要素 | ライトテーマ | ダークテーマ（k-ba-man） |
|---|---|---|
| 本文 | 400 | 400 （16px 以上なら補正不要） |
| 見出し | 700 | 700 or 500 （サイズ依存） |
| ラベル | 500 | 400 |
| 小テキスト（12px） | 400 | 300 は使えない（Noto Sans JP 最低 100 だが細すぎ）→ 400 + opacity 0.8 |

k-ba-man は純粋ダークテーマ専用のため、既にダーク用に最適化した値を使えばよい。

### 6-4. letter-spacing の調整

ダークテーマでは字間をわずかに広げると、光のにじみで詰まって見える現象を緩和できる。

```css
:root {
  --ls-body: 0.02em;     /* 本文 */
  --ls-heading: 0.04em;  /* 見出し（明朝） */
  --ls-label: 0.06em;    /* ラベル・キャプション */
  --ls-mono: 0;           /* 等幅は字間を変えない */
}
```

### 6-5. テキストカラーの設計

現行の `--ink: #edeae0`（温かみのあるオフホワイト）は純白 `#fff` よりダーク背景でのコントラストが柔らかく、長時間読める。良い選択。

```
コントラスト比（WCAG AA 基準: 4.5:1 以上）:
  --ink (#edeae0) on --bg (#0b0c11)  → 約 15.4:1 ✓
  --text (#a8a59c) on --bg (#0b0c11) → 約 7.1:1  ✓
  --muted (#62647a) on --bg (#0b0c11) → 約 3.1:1  ✗ (AA失敗。大テキスト限定)
```

**改善提案**: `--muted` をメタ情報や装飾にのみ使い、読ませるテキストには `--text` 以上を使う。あるいは `--muted` を `#7a7c92` 程度に明るくして AA を確保。

---

## 7. 世界観キーワードとタイポグラフィの接続

### 7-1. 「和紙のテクスチャ」× 明朝体

Shippori Mincho B1 の筆の入り・抜きの表現は、和紙に墨で書いたような質感を持つ。これを活かすための手法:

- **背景テクスチャ**: 和紙風の微細なノイズ画像（透過 PNG、opacity 3-5%）をセクション背景に敷く
- **CSS のみの代替**: `filter: url(#noise)` + SVG feTurbulence で紙のざらつきを再現

```css
/* SVG ノイズフィルタ（HTML に <svg> を埋め込み） */
.washi-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,..."); /* ノイズ SVG をインライン化 */
  opacity: 0.04;
  mix-blend-mode: overlay;
  pointer-events: none;
}
```

- **見出しの演出**: 明朝見出しの下に極細のグラデーション下線（`linear-gradient` で金系 → 透明）を引き、墨と金箔の対比を表現

### 7-2. 「金属のヘアライン」× 等幅フォント

JetBrains Mono の直線的で精密なデザインは「精密機器のデータ感」と合致。

- **数値の表示**: `letter-spacing: 0.05em` で余裕を持たせ、ヘアラインの精密感を出す
- **極細ボーダー**: 指標テーブルのセパレータに `1px solid` + `linear-gradient(to right, transparent, var(--border-mid), transparent)` でヘアライン表現
- **数値ラベルのスタイル**: `text-transform: uppercase; font-size: var(--type-xs); letter-spacing: 0.1em` で計器ラベル風

```css
.stat-label {
  font-family: var(--f-mono);
  font-size: var(--type-xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}
```

### 7-3. 「夜の競馬場の照明」× カラーとタイポグラフィ

- 見出し（明朝）に `color: var(--ink)` で温かい金系のテキスト色を使い、「温かい金系グロー」を表現
- 本文（ゴシック）に `color: var(--text)` でやや暗めの色を使い、「冷たい環境光」を表現
- キャラ名表示で `color: var(--char-color)` を使い、照明のスポットライト効果を出す

---

## 8. CSS カスタムプロパティによるキャラカラー展開

design-spec §4-2 のアクセントカラー展開ルール（dim 10% / mid 25% / vivid 100%）の実装:

```css
:root {
  /* 例: 龍之介のテーマカラー */
  --char-tatsunosuke: #8b5cf6;
}

/* color-mix() による3段階展開 */
.char-card[data-char="tatsunosuke"] {
  --char-color: var(--char-tatsunosuke);
  --char-dim:   color-mix(in oklch, var(--char-color) 10%, var(--bg));
  --char-mid:   color-mix(in oklch, var(--char-color) 25%, var(--bg));
  --char-vivid: var(--char-color);
}
```

`color-mix()` は oklch 色空間で混合するのが推奨。sRGB よりも知覚的に均一な中間色が得られ、10人のキャラカラーを並べたときの一貫性が高い。

**ブラウザ対応**: `color-mix()` は 2023年以降の主要ブラウザすべてで対応済み（Chrome 111+, Firefox 113+, Safari 16.4+）。

---

## 9. 実装優先度

| 優先度 | 項目 | 工数目安 |
|---|---|---|
| **P0** | `-webkit-font-smoothing: antialiased` の追加 | 5分 |
| **P0** | `font-variant-numeric: tabular-nums` の数値要素への適用 | 15分 |
| **P1** | タイプスケール（CSS カスタムプロパティ）の定義 | 30分 |
| **P1** | `letter-spacing` の体系的設定 | 20分 |
| **P1** | `--muted` のコントラスト比改善 | 5分 |
| **P2** | フォールバックメトリクス調整（CLS 対策） | 1-2時間 |
| **P2** | `<link rel="preconnect">` の追加 | 5分 |
| **P3** | 和紙テクスチャ・ヘアラインの CSS 実装 | 2-3時間 |

---

## 参考リンク

- [Google Fonts 日本語フォント おすすめ 2026年](https://humhum.co.jp/4931/)
- [Seven rules for perfect Japanese typography](https://www.aqworks.com/blog/perfect-japanese-typography)
- [Beyond Translation: Japanese Typography in Web Design](https://www.ulpa.jp/post/beyond-translation-japanese-typography-in-web-design)
- [Dark mode and variable fonts | CSS-Tricks](https://css-tricks.com/dark-mode-and-variable-fonts/)
- [font-variant-numeric - MDN](https://developer.mozilla.org/ja/docs/Web/CSS/font-variant-numeric)
- [font-feature-settings 実践テク 2026年版](https://sugoyoku.com/blog/blog-3427/)
- [Fixing layout shifts caused by web fonts](https://vincent.bernat.ch/en/blog/2024-cls-webfonts)
- [Improved font fallbacks | Chrome for Developers](https://developer.chrome.com/blog/font-fallbacks)
- [CSS text-rendering and Font Smoothing](https://fontfyi.com/blog/text-rendering-font-smoothing/)
- [タイプスケール計算機 — FontFYI](https://fontfyi.com/ja/tools/type-scale/)
- [Type Project: size-adjust, ascent-override, descent-override](https://staffblog.typeproject.com/en/3508)
- [font-smooth - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/font-smooth)
- [Noto Serif Japanese - Google Fonts](https://fonts.google.com/noto/specimen/Noto+Serif+JP)
