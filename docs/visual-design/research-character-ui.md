# キャラクターUI・世界観表現 — デザイン知見集

> design-spec.md §5-4, §5-5（キャラクターUI）、§4-2（ビジュアル方向性）の実現に必要な技法をまとめる。

---

## 1. キャラクターカードのデザインパターン

### 1-1. 画像優先の縦長カードレイアウト

キャラクターカードでは「立ち絵を大きく見せる」ことが最優先。画像:テキストの面積比は **7:3〜6:4** が推奨される。

```css
/* --- 縦長キャラカード --- */
.character-card {
  --char-color: #c9a840; /* カード単位でキャラカラーを注入 */

  display: flex;
  flex-direction: column;
  border-radius: 6px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  transition: transform 150ms ease, border-color 150ms ease;
}

/* 画像エリア — カード高さの 65〜70% を占める */
.character-card__image-wrap {
  position: relative;
  aspect-ratio: 3 / 4; /* design-spec 推奨: 最低 3:4、理想 2:3 */
  overflow: hidden;
  background: color-mix(in oklch, var(--char-color) 8%, var(--surface));
}

.character-card__image-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 20%; /* バスト〜ウエスト中心に切り抜き */
}

/* 下部グラデーション — 画像からテキスト領域への滑らかな遷移 */
.character-card__image-wrap::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 40%;
  background: linear-gradient(
    to bottom,
    transparent,
    color-mix(in oklch, var(--char-color) 5%, var(--surface))
  );
  pointer-events: none;
}

/* テキストエリア */
.character-card__body {
  padding: 14px 16px 18px;
}

.character-card__name {
  font-family: var(--f-serif);
  font-size: 1.1rem;
  color: var(--ink);
  margin: 0 0 2px;
}

.character-card__epithet {
  font-size: 0.75rem;
  color: var(--muted);
  letter-spacing: 0.04em;
}
```

### 1-2. カード単位のキャラカラー適用

CSS custom properties をカード要素に直接設定し、`color-mix()` で dim / mid / vivid の3段階を生成する。

```css
/* --- キャラカラー3段階展開 --- */
.character-card {
  --char-dim:   color-mix(in oklch, var(--char-color) 10%, var(--bg));
  --char-mid:   color-mix(in oklch, var(--char-color) 25%, var(--bg));
  --char-vivid: var(--char-color);
}

/* 適用例 */
.character-card {
  border-bottom: 3px solid var(--char-mid);
}

.character-card:hover {
  border-color: var(--char-vivid);
}

/* 席番号バッジ */
.seat-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--char-vivid);
  color: #fff;
  font-family: var(--f-mono);
  font-size: 0.75rem;
  font-weight: 700;
}
```

**HTML 側でのカラー注入:**

```html
<article class="character-card" style="--char-color: #a85c32">
  <!-- 龍之介のカラーが自動で dim/mid/vivid に展開される -->
</article>
```

> **ポイント**: inline style で `--char-color` を1つ渡すだけで、カード内のすべてのカラーバリエーションが `color-mix()` から自動生成される。JS でデータから注入するのが自然。

### 1-3. 10人の一覧性と個性の両立

10人を一覧したとき「全員違う」ことを即座に伝えるための3つのレイヤー:

| レイヤー | 要素 | 役割 |
|---|---|---|
| 色 | キャラカラーのボーダー/背景ティント | 最も瞬時に識別できる差異 |
| アイコン | 象徴小物のモチーフアイコン（SVG） | 色覚多様性への補完 |
| テキスト | 流派名・二つ名 | 言語的な識別 |

```css
/* グリッド: デスクトップ5列 → タブレット3列 → モバイル1列 */
.character-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(5, 1fr);
  padding-inline: clamp(16px, 4vw, 40px);
}

@media (max-width: 880px) {
  .character-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 620px) {
  .character-grid {
    grid-template-columns: 1fr;
    max-width: 400px;
    margin-inline: auto;
  }
}
```

### 1-4. ゲーム・アニメ系キャラ紹介サイトからの知見

**Game UI Database** (gameuidatabase.com) に収録された 1,300+ タイトルの UI パターンから抽出した設計原則:

| パターン | 説明 | k-ba-man での適用 |
|---|---|---|
| **Character Select 画面** | 大型立ち絵 + 属性パネルの2カラム。選択中キャラに光彩や枠強調 | キャラ詳細のプロフィールヒーロー |
| **Character Intro 演出** | フルスクリーンに立ち絵 + 名前・称号のタイポグラフィ演出 | キャラ詳細の初回表示 |
| **Roster Grid** | サムネイルグリッドで全キャラ一覧。選択状態でハイライト | キャラ一覧ページ |
| **Ranking/Leaderboard** | 順位 + アバター + スコアの表形式。上位にゴールド装飾 | 成績ランキング |

**参考事例**: 原神（Genshin Impact）の公式サイトでは、各キャラページにフルスクリーンの立ち絵ヒーロー + 属性情報パネルを配置し、キャラの元素カラーを背景のグラデーションに反映している。k-ba-man のキャラ詳細も同様のアプローチが有効。

---

## 2. プロフィールヒーロー

### 2-1. 大型立ち絵 + キャラカラー背景の実装

```css
/* --- プロフィールヒーロー --- */
.profile-hero {
  --char-color: #c9a840;

  position: relative;
  min-height: 70vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: end;
  overflow: hidden;
  background: var(--bg);
}

/* キャラカラーのグラデーション背景 */
.profile-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 80% 100% at 30% 80%,
      color-mix(in oklch, var(--char-color) 15%, transparent) 0%,
      transparent 70%
    ),
    linear-gradient(
      to bottom,
      transparent 40%,
      color-mix(in oklch, var(--char-color) 8%, var(--bg)) 100%
    );
  pointer-events: none;
}

/* 立ち絵: 足元まで全身を見せる */
.profile-hero__illustration {
  position: relative;
  z-index: 1;
  align-self: stretch;
  display: flex;
  align-items: flex-end; /* 足元を下端に揃える */
  justify-content: center;
  padding: 0 20px;
}

.profile-hero__illustration img {
  max-height: 85vh;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  /* 背景から浮かせるドロップシャドウ */
  filter: drop-shadow(0 8px 32px rgba(0, 0, 0, 0.6));
}

/* テキスト情報 */
.profile-hero__info {
  position: relative;
  z-index: 1;
  padding: clamp(24px, 4vw, 48px);
  align-self: center;
}
```

### 2-2. `filter: drop-shadow()` vs `box-shadow` の使い分け

キャラクター立ち絵を背景から浮かせる際の重要な違い:

| プロパティ | 挙動 | 適用場面 |
|---|---|---|
| `box-shadow` | 要素の**矩形ボックス**に影をつける | カード、パネル等の矩形要素 |
| `filter: drop-shadow()` | 画像の**アルファチャネル（輪郭）**に沿った影 | PNG 立ち絵（透過背景） |

```css
/* 透過PNG の立ち絵にはこちら */
.character-illustration {
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5));
}

/* 多重影でリッチな表現 */
.character-illustration--hero {
  filter:
    drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))
    drop-shadow(0 16px 48px rgba(0, 0, 0, 0.3));
}

/* キャラカラーのグロー影（控えめに） */
.character-illustration--glow {
  filter:
    drop-shadow(0 0 20px color-mix(in oklch, var(--char-color) 30%, transparent))
    drop-shadow(0 8px 32px rgba(0, 0, 0, 0.5));
}
```

> **Josh W. Comeau の影設計の原則**: 影は「光源の方向」と「距離」の2つで制御する。近い要素は小さくシャープな影、遠い要素は大きくぼやけた影。ダークテーマでは影は見えにくいため、**border（薄い明るい線）** との併用が効果的。

### 2-3. `object-fit` / `object-position` による立ち絵制御

```css
/* 全身表示（プロフィールヒーロー） */
.profile-illustration {
  width: 100%;
  height: 100%;
  object-fit: contain; /* アスペクト比を保って全体を表示 */
  object-position: center bottom; /* 足元を下端に合わせる */
}

/* バスト〜ウエスト表示（カード一覧） */
.card-illustration {
  width: 100%;
  height: 100%;
  object-fit: cover; /* コンテナを埋める（はみ出しはクリップ） */
  object-position: center 25%; /* 顔〜バストを中心に */
}

/* 顔中心の円形マスク（ランキング行） */
.avatar-illustration {
  width: 44px;
  height: 44px;
  object-fit: cover;
  object-position: center 15%; /* 顔の位置に合わせる */
  border-radius: 50%;
  border: 2px solid var(--char-mid);
}
```

> **ポイント**: `object-position` のY値はキャラごとに異なる場合がある（髪型や帽子の高さ）。データ属性で微調整値を持たせることも検討。

### 2-4. 前後キャラナビゲーション

席番号順で前後キャラに遷移するUI。ゲームの「キャラセレクト」パターンを応用。

```css
.profile-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: clamp(24px, 4vw, 40px);
}

.profile-nav__link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--surface);
  border: 1px solid var(--border);
  color: var(--text);
  transition: border-color 150ms ease, background 150ms ease;
}

.profile-nav__link:hover {
  border-color: var(--border-mid);
  background: var(--surface-2);
}

/* 前後リンクのミニアバター */
.profile-nav__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center 15%;
}

/* モバイル: ページ最下部にも複製（thumb zone 配慮） */
@media (max-width: 620px) {
  .profile-nav--bottom {
    position: sticky;
    bottom: 0;
    padding: 12px 16px;
    background: var(--bg);
    border-top: 1px solid var(--border);
  }
}
```

### 2-5. モバイルでの立ち絵表示

```css
@media (max-width: 620px) {
  .profile-hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  /* ビジュアルファースト: 立ち絵を先に表示 */
  .profile-hero__illustration {
    order: -1;
    height: min(50vh, 360px); /* design-spec 指定 */
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .profile-hero__illustration img {
    max-height: 100%;
    object-fit: contain;
    object-position: center bottom;
  }

  .profile-hero__info {
    padding: 20px 16px;
  }
}
```

---

## 3. 「この席に残る理由」ブロック

### 3-1. ドラマテキストの独立視覚ブロック

`drama` テキストは通常のコンテンツとは異なる「物語的な重み」を持つ。引用ブロック（blockquote）のバリエーションとして、切迫感のあるビジュアルで独立させる。

```css
/* --- ドラマブロック: 「この席に残る理由」 --- */
.drama-block {
  --char-color: #c9a840;

  position: relative;
  margin: clamp(24px, 4vw, 40px) 0;
  padding: clamp(20px, 3vw, 32px) clamp(20px, 3vw, 32px) clamp(20px, 3vw, 32px) clamp(24px, 3.5vw, 40px);
  background: color-mix(in oklch, var(--char-color) 5%, var(--surface));
  border-left: 3px solid var(--char-mid);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

/* 上部ラベル */
.drama-block__label {
  display: block;
  margin-bottom: 10px;
  font-family: var(--f-mono);
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--char-mid);
}

/* ドラマテキスト本文 */
.drama-block__text {
  font-family: var(--f-serif);
  font-size: clamp(0.95rem, 1.2vw, 1.05rem);
  line-height: 1.8;
  color: var(--ink);
  margin: 0;
}

/* 控えめな底部装飾 — 金属のヘアライン */
.drama-block::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 3px;
  right: 0;
  height: 1px;
  background: linear-gradient(
    to right,
    color-mix(in oklch, var(--char-color) 20%, transparent),
    transparent 80%
  );
}
```

### 3-2. 緊張感・切迫感のビジュアル表現パターン

design-spec のトーン「席を守る切迫」「外れの重み」を視覚的に伝えるテクニック:

| テクニック | CSS 手法 | 使いどころ |
|---|---|---|
| **左端の太ボーダー** | `border-left: 3px solid` | ドラマブロック、警告系コールアウト |
| **暗い背景にキャラカラーのティント** | `color-mix(…color 5%…)` | ドラマブロック背景 |
| **明朝体の起用** | `font-family: var(--f-serif)` | 物語的テキストの格上げ |
| **微かなテクスチャ** | SVG ノイズオーバーレイ | 和紙の質感 → 重厚さ |
| **降格圏の視覚表現** | 赤系ティント + 点滅しないパルス | 席次 8〜10位のランキング行 |

```css
/* 降格圏の行 — 赤のごく薄いティントで「危うさ」を示す */
.ranking-row[data-rank="10"] {
  background: color-mix(in oklch, var(--red) 6%, var(--surface));
  border-left: 2px solid var(--red);
}

.ranking-row[data-rank="9"],
.ranking-row[data-rank="8"] {
  background: color-mix(in oklch, var(--red) 3%, var(--surface));
  border-left: 2px solid color-mix(in oklch, var(--red) 40%, var(--border));
}
```

---

## 4. 関連キャラクターの表示

### 4-1. ペアカードのレイアウト

`relationships` データの `type`（conflict / complement / foil）と `axis`（「物語 vs 検証」等）を視覚的に表現する。

```css
/* --- 関連キャラ セクション --- */
.related-characters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ペアカード */
.relation-card {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: border-color 150ms ease;
}

.relation-card:hover {
  border-color: var(--border-mid);
}

/* 対象キャラのアバター */
.relation-card__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center 15%;
}

/* 軸ラベル（例: 「物語 vs 検証」） */
.relation-card__axis {
  font-family: var(--f-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  color: var(--muted);
}

.relation-card__name {
  font-weight: 700;
  color: var(--ink);
}

.relation-card__reason {
  font-size: 0.85rem;
  color: var(--text);
  margin-top: 4px;
}
```

### 4-2. 関係タイプの視覚区別

3タイプを**色**ではなく**アイコン + ラベル**で区別する（セマンティックカラーとの干渉を避ける）:

| type | アイコン | ラベル | ボーダー色 |
|---|---|---|---|
| `conflict` | ⚔ (交差した剣) | 対立 | `var(--amber)` の dim |
| `complement` | ⟷ (双方向矢印) | 補完 | `var(--green)` の dim |
| `foil` | ◇ (菱形) | 対照 | `var(--muted)` |

```css
.relation-card[data-type="conflict"] {
  border-left: 3px solid color-mix(in oklch, var(--amber) 40%, var(--border));
}

.relation-card[data-type="complement"] {
  border-left: 3px solid color-mix(in oklch, var(--green) 40%, var(--border));
}

.relation-card[data-type="foil"] {
  border-left: 3px solid var(--muted);
}
```

### 4-3. 将来の円卓相関図への拡張性

初期は「ペアカードのリスト」だが、将来的に円卓を模した相関図に発展させる設計余地を残す:

- `relationships` データ構造を**グラフ構造**（ノード＝キャラ、エッジ＝関係）として扱える形にしておく
- 表示コンポーネントを `<section class="related-characters">` として独立させ、差し替え可能にする
- 初期実装では SVG やキャンバスは使わず、CSS Grid + データ属性で対応

---

## 5. 「円卓」と「競馬場」の二重空間

### 5-1. 和紙テクスチャ — SVG `feTurbulence` ノイズ

明朝体見出しとの親和性が高い和紙風テクスチャを、インライン SVG フィルタで実現する。外部画像不要。

```html
<!-- インライン SVG ノイズフィルタ（HTML に1つだけ配置） -->
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <filter id="paper-noise">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.65"
      numOctaves="4"
      stitchTiles="stitch"
    />
    <feColorMatrix type="saturate" values="0" />
  </filter>
</svg>
```

```css
/* 和紙テクスチャのオーバーレイ */
.texture-paper::before {
  content: '';
  position: absolute;
  inset: 0;
  filter: url(#paper-noise);
  opacity: 0.03; /* 極めて控えめに */
  mix-blend-mode: overlay;
  pointer-events: none;
  z-index: 1;
}

/* 適用: ドラマブロックやヒーローの背景に */
.drama-block,
.profile-hero {
  position: relative;
}
```

> **パフォーマンス注意**: `feTurbulence` フィルタは大きな領域に適用するとレンダリングコストが高い。`will-change: transform` やサイズ制限（`max-height`）で緩和する。ヒーロー全体への適用はテストが必要。

### 5-2. 金属のヘアライン — 精密機器のデータ感

「金属のヘアライン」はデータ表示領域（ランキングテーブル、統計セクション）の区切り線として効果的。

```css
/* ヘアラインセパレーター */
.hairline {
  height: 1px;
  border: none;
  background: linear-gradient(
    to right,
    transparent,
    color-mix(in oklch, var(--ink) 12%, transparent) 20%,
    color-mix(in oklch, var(--ink) 12%, transparent) 80%,
    transparent
  );
}

/* Retina 対応の 0.5px ボーダー */
@media (min-resolution: 2dppx) {
  .hairline-border {
    border-width: 0.5px;
  }
}

/* テーブルのセルセパレーター */
.ranking-table td {
  border-bottom: 1px solid color-mix(in oklch, var(--ink) 6%, transparent);
}

/* 金属的なグラデーション線（セクション区切り） */
.metallic-separator {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(168, 165, 156, 0.06) 10%,
    rgba(168, 165, 156, 0.15) 30%,
    rgba(201, 168, 64, 0.12) 50%,
    rgba(168, 165, 156, 0.15) 70%,
    rgba(168, 165, 156, 0.06) 90%,
    transparent 100%
  );
}
```

### 5-3. 夜の競馬場の照明 — 温かい金系グロー × 冷たい環境光

design-spec のキーワード「夜の競馬場の照明」を CSS で表現するテクニック:

```css
/* 暖色のスポットライト効果（ヒーロー等） */
.warm-glow {
  background:
    radial-gradient(
      ellipse 60% 40% at 50% 80%,
      color-mix(in oklch, var(--gold) 8%, transparent) 0%,
      transparent 70%
    );
}

/* 冷たい環境光（全体の底辺に薄く） */
.cool-ambient {
  background:
    linear-gradient(
      to bottom,
      transparent 85%,
      color-mix(in oklch, oklch(0.6 0.05 240) 4%, transparent) 100%
    );
}

/* ヒーローの照明演出 — 暖色グローと冷色環境光のレイヤー */
.hero-lighting {
  position: relative;
}

.hero-lighting::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    /* 暖色: 左下からのスポットライト */
    radial-gradient(
      ellipse 50% 60% at 25% 90%,
      rgba(201, 168, 64, 0.06) 0%,
      transparent 60%
    ),
    /* 冷色: 右上からの環境光 */
    radial-gradient(
      ellipse 40% 50% at 80% 10%,
      rgba(100, 140, 200, 0.04) 0%,
      transparent 50%
    );
  pointer-events: none;
}
```

### 5-4. 背景画像の効果的な使い方

design-spec §3-2 に4種の背景画像がある（円卓の間、監査室、トラック朝焼け、マーケットブース）。ページの性格に応じて使い分ける:

| ページ | 背景 | 意図 |
|---|---|---|
| Overview ヒーロー | アンサンブル戦闘シーン / 集合ビジュアル | プロジェクトの世界観を一枚で |
| キャラ詳細 | 円卓の間 or キャラカラーのグラデーション | 「この席」の空間 |
| 成績ランキング | 監査室 | 「裁きの場」の緊張感 |
| 予想ライブ | トラック朝焼け | レース当日の臨場感 |

```css
/* 背景画像の共通パターン — 暗くぼかして上にコンテンツを載せる */
.page-hero--bg {
  position: relative;
  overflow: hidden;
}

.page-hero--bg::before {
  content: '';
  position: absolute;
  inset: -20px; /* ぼかしの端が見えないように拡張 */
  background-image: var(--hero-bg);
  background-size: cover;
  background-position: center;
  filter: blur(8px) brightness(0.3);
  z-index: 0;
}

.page-hero--bg > * {
  position: relative;
  z-index: 1;
}
```

### 5-5. 参照ジャンルの視覚的テクニック

design-spec が参照する『ブルーロック』『賭ケグルイ』系の緊張感をWebデザインに転写するテクニック:

| 演出 | 原作での使い方 | Web CSS での実装 |
|---|---|---|
| **斜めの切り込み** | パネル割り、キャラ紹介 | `clip-path: polygon()` でカードの角を斜めに |
| **高コントラストの対比** | 決戦場面 | ダーク背景 × ゴールド/ホワイトの大型タイポグラフィ |
| **静止した緊張感** | キャラの凝視、沈黙のコマ | モーションを**抑える**ことで緊張を表現（動かないことが演出） |
| **データの冷たさ** | 賭ケグルイの賭け金表示 | モノスペースフォント + 等幅数値 + 金属的ヘアライン |
| **勢力図/序列** | ブルーロック・キングダムの一覧 | ランキング表の降格圏演出 |

```css
/* 斜め切り込みのカード（オプション — 使いすぎ注意） */
.character-card--angled {
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), 0 100%);
}

/* 大型タイポグラフィの緊張感 */
.hero-title {
  font-family: var(--f-serif);
  font-size: clamp(2.2rem, 5.5vw, 5rem);
  color: var(--ink);
  letter-spacing: 0.02em;
  /* 明朝体の太ウェイトで「重さ」を出す */
  font-weight: 700;
}
```

> **「避けるべきもの」の確認**: ネオン/サイバーパンク（過剰なグロー効果）、純粋なフラットUI（depth 感の欠如）、過剰なグラデーション。k-ba-man のトーンは「抑制された緊張」であり、派手な装飾ではなく、暗さと沈黙が演出の中心。

---

## 6. 実装優先度

| 優先度 | 項目 | 理由 |
|---|---|---|
| **P0** | カード単位の `--char-color` + `color-mix()` 3段階展開 | 全ページの基盤 |
| **P0** | `object-fit` / `object-position` の立ち絵表示ルール統一 | 画像表示の一貫性 |
| **P0** | プロフィールヒーローの2カラムレイアウト | キャラ詳細の骨格 |
| **P1** | ドラマブロックのスタイリング | 物語的コンテンツの差別化 |
| **P1** | `filter: drop-shadow()` による立ち絵浮き上がり | 世界観の深度表現 |
| **P1** | 関連キャラクターのペアカード | キャラ間の導線 |
| **P2** | 和紙テクスチャ（SVG feTurbulence） | 世界観の質感。パフォーマンス検証要 |
| **P2** | 金属ヘアラインセパレーター | データ領域の精密感 |
| **P2** | 暖色/冷色の照明グラデーション | 夜の競馬場の雰囲気 |
| **P3** | 背景画像のぼかし演出 | 画像アセットの準備次第 |
| **P3** | 斜め切り込み（clip-path） | オプション演出。使いすぎリスク |

---

## 参考リソース

- [CSS Cards: Free Examples & Code Snippets — freefrontend.com](https://freefrontend.com/css-cards/)
- [UI Card Design: Examples, Best Practices & Common Patterns — stan.vision](https://www.stan.vision/journal/ui-card-design-examples-best-practices-and-common-patterns)
- [10 Card UI Design Examples That Actually Work in 2026 — bricxlabs.com](https://bricxlabs.com/blogs/card-ui-design-examples)
- [Designing Beautiful Shadows in CSS — Josh W. Comeau](https://www.joshwcomeau.com/css/designing-shadows/)
- [CSS object-fit / object-position — CSS-Tricks](https://css-tricks.com/on-object-fit-and-object-position/)
- [filter: drop-shadow() — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow)
- [Grainy Gradients (SVG feTurbulence) — CSS-Tricks](https://css-tricks.com/grainy-gradients/)
- [SVG Filter Effects: Creating Texture with feTurbulence — Codrops](https://tympanus.net/codrops/2019/02/19/svg-filter-effects-creating-texture-with-feturbulence/)
- [Creating a metallic effect with CSS — ibelick.com](https://ibelick.com/blog/creating-metallic-effect-with-css/)
- [8 Amazing Metallic Effects Built With CSS & JavaScript — Speckyboy](https://speckyboy.com/metallic-effects-css-javascript/)
- [CSS Retina Hairline — Alex Dieulot](http://dieulot.net/css-retina-hairline)
- [Creating color palettes with CSS color-mix() — MDN Blog](https://developer.mozilla.org/en-US/blog/color-palettes-css-color-mix/)
- [color-mix() with Custom Properties — CodePen](https://codepen.io/_rahul/pen/ExRrMOp)
- [Game UI Database — gameuidatabase.com](https://www.gameuidatabase.com/)
- [Game UI Database: Character Select](https://www.gameuidatabase.com/index.php?scrn=41)
- [Game UI Database: Character Intro](https://www.gameuidatabase.com/index.php?scrn=105)
- [CSS Hero Sections — freefrontend.com](https://freefrontend.com/css-hero-sections/)
- [CSS Blockquotes — freefrontend.com](https://freefrontend.com/css-blockquotes/)
- [Getting Creative With Quotes — CSS-Tricks](https://css-tricks.com/getting-creative-with-quotes/)
- [Leaderboard Design Pattern — ui-patterns.com](https://ui-patterns.com/patterns/leaderboard)
