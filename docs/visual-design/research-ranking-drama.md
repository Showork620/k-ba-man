# ランキングテーブル・ドラマUI・対立マーカーの調査知見

design-spec.md §5-3（成績ページ）と §8（物語的コンテンツ）の実装に必要なデザイン知識をまとめる。

---

## 1. ランキングテーブルの降格圏演出

### 1-1. スポーツリーグの参考パターン

Premier League・Bundesliga 等のリーグテーブルでは、**行の左端に色帯（4px 程度のボーダー）** を引くのが最も一般的なゾーン表現。

| ゾーン | 典型的な色 | 手法 |
|---|---|---|
| 優勝圏 / CL 圏 | 青〜緑系 | `border-left: 4px solid` |
| EL 圏 | 橙系 | 同上 |
| **降格圏** | **赤系** | 同上 + 行全体に薄い赤背景 |

k-ba-man の場合「降格」は物語上の演出であり、実際の脱退は起きない。したがって**スポーツ UI の直訳（赤＝危険）ではなく、「緊張のトーン」** で表現する。

### 1-2. k-ba-man 向けの降格圏デザイン提案

#### 強度のグラデーション（10位→8位で減衰）

```css
:root {
  --danger-glow: oklch(0.55 0.18 25);   /* 暗めの赤 */
  --danger-dim:  oklch(0.55 0.08 25);   /* 弱い赤 */
}

/* 10位：最も強い危機感 */
.ranking-row[data-rank="10"] {
  background: color-mix(in oklch, var(--danger-glow) 12%, var(--surface-1));
  border-left: 3px solid var(--danger-glow);
  box-shadow: inset 0 0 20px color-mix(in oklch, var(--danger-glow) 6%, transparent);
}

/* 9位：中間 */
.ranking-row[data-rank="9"] {
  background: color-mix(in oklch, var(--danger-dim) 8%, var(--surface-1));
  border-left: 3px solid var(--danger-dim);
}

/* 8位：かすかな警告 */
.ranking-row[data-rank="8"] {
  background: color-mix(in oklch, var(--danger-dim) 4%, var(--surface-1));
  border-left: 3px solid color-mix(in oklch, var(--danger-dim) 50%, var(--surface-1));
}
```

#### 「物語上の演出」であることの明示

- 降格圏の下に小さな注釈: `<p class="ranking-note">※ 降格圏は物語上の緊張演出です</p>`
- 3レース未満のキャラには `data-provisional` 属性を付け、「参考順位」と表示
- 注釈は `font-size: 0.75rem; opacity: 0.6` で控えめに

```css
.ranking-note {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 8px;
  text-align: center;
}

.ranking-row[data-provisional] .rank-number {
  opacity: 0.5;
  font-style: italic;
}
.ranking-row[data-provisional]::after {
  content: '参考';
  font-size: 0.65rem;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--surface-2);
  color: var(--text-muted);
  margin-left: 6px;
}
```

#### アニメーションの注意

揺らぎや点滅アニメーションは design-spec §4-5 の「控えめが基本」に反する。降格圏は**静的な色味の変化だけ**で表現し、ホバー時に「現在の降格リスク」的なツールチップを出す程度に留める。

### 1-3. 降格圏の判定ロジック（再掲）

```
記録3レース以上 AND 暫定席次 ∈ {8, 9, 10}
→ 10位: danger-strong / 9位: danger-mid / 8位: danger-weak
記録3レース未満 → data-provisional（降格圏判定なし）
```

---

## 2. ソート可能テーブルの UI/UX デザイン

### 2-1. ソートUI の選択肢比較

| パターン | 長所 | 短所 | k-ba-man での適合度 |
|---|---|---|---|
| **カラムヘッダークリック** | 直感的、省スペース | ヘッダーが見えないとソートできない | △ モバイルでは5列表示しない |
| **ドロップダウン** | 省スペース、モバイル向き | 選択肢が隠れる | ○ |
| **セグメントコントロール** | 選択肢が常に見える、操作が速い | 5種は多い | ○ 短縮ラベルなら収まる |
| **ハイブリッド（デスクトップ: ヘッダー / モバイル: ドロップダウン）** | 最適化できる | 実装が2系統 | ◎ 推奨 |

#### 推奨: ハイブリッド方式

```html
<!-- デスクトップ: テーブルヘッダーにソートボタン -->
<thead>
  <tr>
    <th aria-sort="descending">
      <button>
        暫定スコア
        <span class="sort-icon" aria-hidden="true">▼</span>
      </button>
    </th>
    <th>
      <button>
        Brier
        <span class="sort-icon" aria-hidden="true">♢</span>
      </button>
    </th>
    <!-- ... 他の列 -->
  </tr>
</thead>

<!-- モバイル: テーブル上部にドロップダウン -->
<div class="sort-control-mobile">
  <label for="sort-select">並び替え</label>
  <select id="sort-select">
    <option value="score" selected>席次</option>
    <option value="brier">Brier</option>
    <option value="honmei">◎実績</option>
    <option value="coverage">網羅率</option>
    <option value="logloss">LogLoss</option>
  </select>
</div>
```

### 2-2. ソート中の視覚的強調

```css
/* ソート中のカラムヘッダー */
th[aria-sort] button {
  color: var(--accent-gold);
  font-weight: 700;
}

/* ソート中のカラム全体を薄くハイライト */
col.sorted {
  background-color: oklch(1 0 0 / 0.03);  /* 極薄い白 */
}

/* ソートアイコン */
.sort-icon {
  margin-left: 4px;
  font-size: 0.7em;
  opacity: 0.4;
  transition: opacity 150ms ease;
}
th[aria-sort] .sort-icon {
  opacity: 1;
}
th:hover .sort-icon {
  opacity: 0.7;
}
```

### 2-3. ソートアニメーション（FLIP テクニック）

行の並び替えアニメーションは **FLIP（First, Last, Invert, Play）** テクニックで実装する。

```javascript
function sortWithAnimation(tbody, compareFn) {
  const rows = [...tbody.querySelectorAll('tr')];

  // First: 現在の位置を記録
  const firstRects = new Map();
  rows.forEach(row => {
    firstRects.set(row, row.getBoundingClientRect());
  });

  // DOM 並び替え（Last は自動的に確定）
  rows.sort(compareFn);
  rows.forEach(row => tbody.appendChild(row));

  // Invert + Play
  rows.forEach(row => {
    const first = firstRects.get(row);
    const last = row.getBoundingClientRect();
    const deltaY = first.top - last.top;

    if (Math.abs(deltaY) < 1) return; // 動かない行はスキップ

    row.style.transform = `translateY(${deltaY}px)`;
    row.style.transition = 'none';

    requestAnimationFrame(() => {
      row.style.transition = 'transform 300ms ease-out';
      row.style.transform = '';
    });
  });
}
```

**注意**: `prefers-reduced-motion` の場合は即時切り替え。

```javascript
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (prefersReduced) {
  // FLIP スキップ、DOM 並び替えのみ
  rows.sort(compareFn);
  rows.forEach(row => tbody.appendChild(row));
  return;
}
```

### 2-4. アクセシビリティ（WAI-ARIA APG 準拠）

W3C WAI-ARIA Authoring Practices Guide のソートテーブル例に基づく:

1. **`aria-sort` は現在ソート中の列にのみ設定**。他の列からは属性自体を除去（`none` ではなく除去）
2. **ソートボタンは `<button>` で `th` 内に配置**。クリックターゲットはセル全体に広げる
3. **ソート方向の視覚インジケータ**: `▲` `▼` を `aria-hidden="true"` の `<span>` で表示
4. **`<caption>` にソート機能の説明を追記**（各ボタンに繰り返さず冗長性を防ぐ）
5. **ライブリージョンで変更を通知**（一部スクリーンリーダーはソート変更を読み上げない）

```html
<table aria-labelledby="ranking-caption">
  <caption id="ranking-caption">
    暫定ランキング
    <span class="sr-only">。列見出しのボタンでソートできます。</span>
  </caption>
  <!-- ... -->
</table>

<!-- ソート変更時の通知 -->
<div id="sort-status" role="status" aria-live="polite" class="sr-only"></div>
```

```javascript
function announceSort(columnName, direction) {
  const status = document.getElementById('sort-status');
  const dirLabel = direction === 'ascending' ? '昇順' : '降順';
  status.textContent = `${columnName}で${dirLabel}にソートしました`;
  setTimeout(() => { status.textContent = ''; }, 1000);
}
```

---

## 3. 週次ドラマの自動生成 UI

### 3-1. 「今週の円卓」帯のデザインパターン比較

| パターン | 見た目 | 適合度 | 理由 |
|---|---|---|---|
| ニュースティッカー（横スクロール） | テキストが左→右に流れる | × | 読みにくい、安っぽい |
| **ハイライトカード** | 1〜2文の大きめテキスト + キャラアイコン | ◎ | 視認性が高く、キャラ中心 |
| バナー（帯） | 背景色付きの横長帯 | ○ | シンプルだがキャラの存在感が薄い |
| カルーセル | 複数のドラマを左右スワイプ | △ | 操作が必要、情報が隠れる |

#### 推奨: ハイライトカード型

Overview のヒーロー直下に1枚のカードとして配置。データから自動生成された1〜2文のナラティブ + 関連キャラのミニアイコンを表示。

```html
<section class="weekly-drama" aria-label="今週のドラマ">
  <div class="drama-card">
    <div class="drama-icons">
      <img src="assets/characters/tatsunosuke/mini.png"
           alt="龍之介" class="drama-avatar" loading="lazy">
      <span class="drama-arrow" aria-hidden="true">↑</span>
    </div>
    <p class="drama-text">
      <strong>龍之介</strong>が3連勝で<em>5席上昇</em>。
      血統読みが芝2400mで冴えわたる。
    </p>
  </div>
</section>
```

```css
.weekly-drama {
  margin-top: var(--space-md);
  margin-bottom: var(--space-md);
}

.drama-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: var(--surface-1);
  border-left: 3px solid var(--accent-gold);
  border-radius: 6px;
}

.drama-icons {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.drama-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.drama-arrow {
  font-size: 1.2rem;
  color: var(--semantic-up);  /* 緑系 */
  font-weight: 700;
}

.drama-text {
  font-size: 0.95rem;
  line-height: 1.6;
  color: var(--text-primary);
}
.drama-text strong {
  color: var(--char-tatsunosuke);  /* キャラカラー */
}
.drama-text em {
  color: var(--semantic-up);
  font-style: normal;
  font-weight: 600;
}
```

### 3-2. ナラティブ生成のテンプレートパターン

データ駆動のナラティブは**テンプレートベース**が最もシンプルかつ保守しやすい。

```javascript
const DRAMA_TEMPLATES = {
  bigRise: (name, delta) =>
    `<strong>${name}</strong>が<em>${delta}席上昇</em>。勢いが止まらない。`,

  bigFall: (name, delta) =>
    `<strong>${name}</strong>が<em>${Math.abs(delta)}席下降</em>。席が揺らいでいる。`,

  collectiveHit: (horseName) =>
    `集合知の◎<strong>${horseName}</strong>が的中。円卓の総意が正しかった。`,

  collectiveMiss: () =>
    `集合知の◎が圏外。全員の読みが外れた週。`,

  loneWolf: (name, horseName) =>
    `<strong>${name}</strong>だけが◎<strong>${horseName}</strong>を指名し、的中。孤独な正解。`,
};

function generateDrama(raceResult, prevRanking, currRanking) {
  const dramas = [];

  // 席次変動の最大上昇
  const rises = currRanking.map((c, i) => ({
    ...c,
    delta: prevRanking.findIndex(p => p.id === c.id) - i
  })).filter(c => c.delta > 0);

  if (rises.length) {
    const biggest = rises.sort((a, b) => b.delta - a.delta)[0];
    dramas.push({
      type: 'bigRise',
      html: DRAMA_TEMPLATES.bigRise(biggest.name, biggest.delta),
      charId: biggest.id,
    });
  }

  // ... 他のパターンも同様に判定

  // 最も「劇的」なものを1〜2件返す
  return dramas.slice(0, 2);
}
```

### 3-3. 鮮度マーカーのデザイン

「最終更新日時」は**コンテンツの邪魔をせず、かつ見つけられる**位置に配置。

```html
<time class="freshness" datetime="2026-06-22T10:30:00+09:00">
  最終更新: 2026年6月22日 10:30
</time>
```

```css
.freshness {
  display: block;
  font-size: 0.7rem;
  color: var(--text-muted);
  text-align: right;
  padding: 4px 0;
  letter-spacing: 0.02em;
}
```

配置場所:
- **ライブページ**: ページヒーロー内、フェーズ表示の右寄せ
- **成績ページ**: テーブル上部の右端
- **Overview**: 予想ライブバナー内に組み込み

---

## 4. 対立マーカーの視覚デザイン

### 4-1. 設計原則

design-spec §2-3:
> 集合知からのズレを**責める表示ではなく、多様性の可視化**として扱う

したがって:
- ❌ 赤いバツ印、警告アイコン、「不一致」の文言
- ✅ **ニュートラルなトーンの差分マーカー**

### 4-2. マーカーの選択肢比較

| パターン | 見た目 | トーン | 推奨度 |
|---|---|---|---|
| 赤バッジ「不一致」 | 🔴 ズレ | 否定的 | × |
| 黄色い三角「⚠」 | ⚠ | 警告的 | × |
| **分岐アイコン + 「独自路線」テキスト** | ⑂ 独自路線 | 中立〜肯定的 | ◎ |
| **色の異なるボーダーライン** | 左ボーダーが集合知カラーと異なる | 控えめ | ○ |
| **ドットインジケータ** | ● | 最小限 | ○（補助的に） |

#### 推奨: 分岐マーカー + ツールチップ

```html
<div class="prediction-card" data-divergent>
  <div class="card-header">
    <img src="assets/characters/hina/mini.png" alt="" class="card-avatar">
    <span class="card-name">陽菜</span>
    <!-- 対立マーカー -->
    <span class="divergent-marker" title="集合知と異なる◎を指名">
      <svg class="divergent-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16">
        <!-- 分岐を示すフォークアイコン -->
        <path d="M8 1v6M8 7l-4 4M8 7l4 4" stroke="currentColor"
              stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </svg>
      <span class="divergent-label">独自路線</span>
    </span>
  </div>
  <!-- ... -->
</div>
```

```css
.divergent-marker {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 10px;
  background: oklch(0.5 0.08 270 / 0.15);  /* 薄い藍系 — ニュートラル */
  color: oklch(0.75 0.08 270);
  font-size: 0.7rem;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.divergent-icon {
  width: 12px;
  height: 12px;
}

/* ホバーで詳細を示す */
.divergent-marker[title]:hover {
  background: oklch(0.5 0.08 270 / 0.25);
}

/* 対立カード全体の控えめな差別化 */
.prediction-card[data-divergent] {
  border-color: oklch(0.5 0.08 270 / 0.3);
}
```

### 4-3. 対立の表示粒度

| 表示場所 | 粒度 | 内容 |
|---|---|---|
| 予想カードヘッダー | マーカーのみ | 「独自路線」ピル |
| 予想カード展開時 | テキスト比較 | 「集合知◎: ○○号 → 陽菜◎: △△号」 |
| 結果フェーズ | 結果付き比較 | 上記 + 的中/外れ |

---

## 5. 答え合わせ・勝ち筋の表示デザイン

### 5-1. ステータスピル（的中結果バッジ）

3状態を **pill 型バッジ** で統一表現する。design-spec §4-8 の記号体系に準拠。

```html
<span class="result-pill result-pill--win">的中</span>
<span class="result-pill result-pill--place">3着内</span>
<span class="result-pill result-pill--out">圏外</span>
```

```css
.result-pill {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.4;
}

/* 的中: gold 系 */
.result-pill--win {
  background: oklch(0.75 0.15 85 / 0.2);
  color: oklch(0.85 0.12 85);
  border: 1px solid oklch(0.75 0.15 85 / 0.3);
}

/* 3着内: 紫/藍系 */
.result-pill--place {
  background: oklch(0.55 0.1 280 / 0.2);
  color: oklch(0.75 0.08 280);
  border: 1px solid oklch(0.55 0.1 280 / 0.3);
}

/* 圏外: 赤系 */
.result-pill--out {
  background: oklch(0.5 0.12 25 / 0.15);
  color: oklch(0.7 0.1 25);
  border: 1px solid oklch(0.5 0.12 25 / 0.2);
}
```

### 5-2. 直近3戦のインライン実績バー

Premier League のフォームガイド（W/D/L の色付きドット列）を参考に、◎結果を3つのドットで表現する。

```html
<div class="recent-form" aria-label="直近3戦: 的中、圏外、3着内">
  <span class="form-dot form-dot--win" title="第3回 宝塚記念: 的中" aria-hidden="true"></span>
  <span class="form-dot form-dot--out" title="第2回 安田記念: 圏外" aria-hidden="true"></span>
  <span class="form-dot form-dot--place" title="第1回 ダービー: 3着内" aria-hidden="true"></span>
  <!-- スクリーンリーダー用テキスト -->
  <span class="sr-only">直近3戦: 的中、圏外、3着内</span>
</div>
```

```css
.recent-form {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.form-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.form-dot--win {
  background: oklch(0.8 0.15 85);   /* gold */
}

.form-dot--place {
  background: oklch(0.6 0.1 280);   /* 藍 */
}

.form-dot--out {
  background: oklch(0.55 0.12 25);  /* 赤 */
}

/* ホバーでツールチップ（レース名＋結果） */
.form-dot[title]:hover {
  transform: scale(1.3);
  transition: transform 150ms ease;
}

/* 拡張: ドットの代わりにテキスト形式 */
.recent-form-text {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.recent-form-text .hit { color: oklch(0.8 0.15 85); }
.recent-form-text .miss { color: oklch(0.55 0.12 25); }
```

#### テキスト形式（design-spec §2-2 の例に近い）

```html
<span class="recent-form-text" aria-label="直近3戦: ◎1着、◎圏外、◎3着内">
  <span class="hit">◎1着</span>→<span class="miss">◎圏外</span>→<span class="hit">◎3着内</span>
</span>
```

### 5-3. 「何を見て、何が起きたか」の対比構造

結果フェーズの答え合わせを**予想 vs 結果の2カラム**で対比させる。

```html
<div class="result-card">
  <div class="result-header">
    <img src="assets/characters/kenta/mini.png" alt="" class="result-avatar">
    <span class="result-name">健太</span>
    <span class="result-pill result-pill--out">圏外</span>
  </div>

  <div class="result-comparison">
    <!-- 予想側 -->
    <div class="comparison-col comparison-col--prediction">
      <span class="comparison-label">予想</span>
      <p class="comparison-value">◎ エフフォーリア（指数1位）</p>
      <p class="comparison-reason">スピード指数が過去5走中最高値を記録。逃げ馬不在でペースが落ち着けば末脚が活きる。</p>
    </div>

    <!-- 結果側 -->
    <div class="comparison-col comparison-col--result">
      <span class="comparison-label">結果</span>
      <p class="comparison-value">◎ エフフォーリア → 8着</p>
      <p class="comparison-reason">前半のハイペースに巻き込まれ、4角で後退。</p>
    </div>
  </div>

  <!-- 直近3戦 -->
  <div class="result-form">
    <span class="form-label">直近3戦</span>
    <div class="recent-form">
      <span class="form-dot form-dot--out" title="圏外"></span>
      <span class="form-dot form-dot--win" title="的中"></span>
      <span class="form-dot form-dot--place" title="3着内"></span>
    </div>
  </div>
</div>
```

```css
.result-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1px;
  margin-top: 12px;
  border-radius: 6px;
  overflow: hidden;
}

.comparison-col {
  padding: 12px;
  background: var(--surface-1);
}

.comparison-col--prediction {
  border-right: 1px solid var(--surface-0);
}

.comparison-label {
  display: block;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.comparison-value {
  font-weight: 600;
  margin-bottom: 4px;
}

.comparison-reason {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* モバイル: 縦積み */
@media (max-width: 620px) {
  .result-comparison {
    grid-template-columns: 1fr;
  }
  .comparison-col--prediction {
    border-right: none;
    border-bottom: 1px solid var(--surface-0);
  }
}
```

### 5-4. 勝ち筋ナラティブ（how_won）の表示

design-spec §8-4: 「数値の要約ではなく、物語的なヘッドライン」

```html
<div class="win-narrative">
  <blockquote class="win-narrative-text">
    集合知の◎エフフォーリアは8着に沈んだが、三連複フォーメーションの2列目に入れた
    イクイノックスが1着。結果として三連複が的中し、配当12,340円を獲得。
  </blockquote>
</div>
```

```css
.win-narrative {
  margin-top: 16px;
  padding: 14px 18px;
  background: var(--surface-1);
  border-left: 3px solid var(--accent-gold);
  border-radius: 0 6px 6px 0;
}

.win-narrative-text {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--text-primary);
  margin: 0;
  font-style: normal;
}
```

---

## 6. 実装判断のまとめ

| 要素 | 推奨パターン | 優先度 |
|---|---|---|
| 降格圏演出 | 3段階の背景色＋左ボーダー（静的） | P0 |
| ソート UI | ハイブリッド（ヘッダー + モバイルドロップダウン） | P0 |
| ソートアニメーション | FLIP テクニック + reduced-motion 対応 | P1 |
| ソート a11y | WAI-ARIA APG 準拠（aria-sort + button + ライブリージョン） | P0 |
| 週次ドラマ | ハイライトカード型（テンプレートベース生成） | P1 |
| 鮮度マーカー | 右寄せ小文字 `<time>` | P2 |
| 対立マーカー | 「独自路線」ピル（分岐アイコン + ラベル） | P0 |
| ステータスピル | 3色ピル（gold / 藍 / 赤） | P0 |
| 直近3戦 | ドット型 + テキスト型の併用 | P0 |
| 答え合わせ対比 | 予想 vs 結果の2カラム Grid | P1 |
| 勝ち筋 | 左ボーダー付き引用ブロック | P1 |

---

## 参考資料

- [Sortable Table Example — WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/table/examples/sortable-table/)
- [Sortable Table Columns — Adrian Roselli](https://adrianroselli.com/2021/04/sortable-table-columns.html)
- [Animating the Unanimatable — Joshua Comeau (FLIP technique)](https://medium.com/developers-writing/animating-the-unanimatable-1346a5aab3cd)
- [Status Indicator Pattern — Carbon Design System](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
- [Visual Indicators to Differentiate Items in a List — NN/g](https://www.nngroup.com/articles/visual-indicators-differentiators/)
- [Badge UI Design — Mobbin](https://mobbin.com/glossary/badge)
- [Football/Soccer League Table HTML/CSS — CodePen](https://codepen.io/Shayley/pen/NWqrvqQ)
- [Premier League Table — CodePen](https://codepen.io/ego/pen/XdWKaB)
- [ARIA: aria-sort attribute — MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Attributes/aria-sort)
- [Data-Driven Sports Storytelling — Data Sports Group](https://datasportsgroup.com/news-article/153805/creating-engaging-sports-content-using-data-driven-storytelling/)
