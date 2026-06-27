# 調査: 3フェーズ制ライブページのUIデザインパターン

design-spec §5-2「予想ライブ」の3フェーズ制UIを実現するためのデザイン知識と技術を集積する。

---

## 1. フェーズナビゲーション（ステッパー）

### 1-1. 現行実装の分析

現行の `app.js` はフェーズナビを `<nav class="live-phase-flow">` + `<a class="live-phase-step">` + テキスト矢印（➜ / ↺）で実装している。構造は機能的だが、以下がデザイン刷新の対象:

- ステップの完了/未到達の視覚的区別がない
- 矢印がテキスト文字のため視覚的にチープ
- モバイルでのサイズ・タッチターゲットが未最適化
- `aria-current` が未設定

### 1-2. 推奨 HTML 構造

```html
<nav class="phase-stepper" aria-label="予想ライブのフェーズ">
  <ol class="phase-stepper__list">
    <li class="phase-stepper__item is-completed">
      <a href="#/live/announce" class="phase-stepper__link">
        <span class="phase-stepper__indicator">
          <span class="phase-stepper__number">1</span>
          <!-- 完了時はチェックマークSVGに差し替え -->
        </span>
        <span class="phase-stepper__label">告知</span>
        <span class="phase-stepper__timing">発走1週前</span>
      </a>
    </li>

    <li class="phase-stepper__item is-current" aria-current="step">
      <a href="#/live/predictions" class="phase-stepper__link" aria-current="step">
        <span class="phase-stepper__indicator">
          <span class="phase-stepper__number">2</span>
        </span>
        <span class="phase-stepper__label">予想公開</span>
        <span class="phase-stepper__timing">レース当日朝</span>
      </a>
    </li>

    <li class="phase-stepper__item is-pending">
      <a href="#/live/result" class="phase-stepper__link">
        <span class="phase-stepper__indicator">
          <span class="phase-stepper__number">3</span>
        </span>
        <span class="phase-stepper__label">結果</span>
        <span class="phase-stepper__timing">レース後</span>
      </a>
    </li>
  </ol>
</nav>
```

**設計判断:**
- `<ol>` で順序性を意味的に表現
- 各ステップはリンク（`<a>`）。design-spec がハッシュルーティングで3フェーズを切り替える設計のため、未到達フェーズへも遷移可能にする
- `aria-current="step"` で現在フェーズをスクリーンリーダーに通知（USWDS Step Indicator の推奨パターン）
- 完了フェーズには `<span class="usa-sr-only">完了</span>` 相当の非表示テキストを付加

### 1-3. CSS 実装パターン

```css
/* --- ステッパーの基本レイアウト --- */
.phase-stepper__list {
  display: flex;
  align-items: flex-start;
  gap: 0;
  list-style: none;
  padding: 0;
  margin: 0;
  counter-reset: step;
}

.phase-stepper__item {
  flex: 1;
  position: relative;
  text-align: center;
}

/* --- インジケーター（円形） --- */
.phase-stepper__indicator {
  --size: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  margin: 0 auto var(--space-sm);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  position: relative;
  z-index: 1;
}

/* --- コネクタライン（疑似要素） --- */
.phase-stepper__item:not(:last-child)::after {
  content: "";
  position: absolute;
  top: calc(var(--size, 2.5rem) / 2);
  left: calc(50% + var(--size, 2.5rem) / 2 + 0.5rem);
  width: calc(100% - var(--size, 2.5rem) - 1rem);
  height: 2px;
  background: var(--surface-2);
  z-index: 0;
}

/* --- 3つの状態 --- */
/* 完了 */
.phase-stepper__item.is-completed .phase-stepper__indicator {
  background: var(--color-semantic-hit);  /* gold系 */
  color: var(--surface-0);
}
.phase-stepper__item.is-completed::after {
  background: var(--color-semantic-hit);
}

/* 現在 */
.phase-stepper__item.is-current .phase-stepper__indicator {
  background: transparent;
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--color-accent) 20%, transparent);
}

/* 未到達 */
.phase-stepper__item.is-pending .phase-stepper__indicator {
  background: var(--surface-1);
  color: var(--text-muted);
}
.phase-stepper__item.is-pending .phase-stepper__label {
  color: var(--text-muted);
}

/* --- ラベルとタイミング --- */
.phase-stepper__label {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: 600;
}
.phase-stepper__timing {
  display: block;
  font-size: var(--font-size-xs);
  color: var(--text-muted);
}
```

### 1-4. コネクタラインの代替実装

**方法A: 疑似要素（上記）** — 最も一般的。位置計算が必要。

**方法B: linear-gradient 背景** — ステッパーコンテナ全体に水平線をグラデーションで描く:
```css
.phase-stepper__list {
  background: linear-gradient(
    to right,
    transparent calc(100% / 6),
    var(--surface-2) calc(100% / 6),
    var(--surface-2) calc(100% * 5 / 6),
    transparent calc(100% * 5 / 6)
  );
  background-size: 100% 2px;
  background-position: center calc(var(--size) / 2);
  background-repeat: no-repeat;
}
```
3ステップ固定なら計算が簡単。動的なステップ数には疑似要素が柔軟。

**方法C: CSS Grid + border** — 各ステップ間にグリッドトラックを挟み、border で線を引く。ステップ数が固定なら最もシンプル:
```css
.phase-stepper__list {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: start;
}
.phase-stepper__connector {
  height: 2px;
  background: var(--surface-2);
  align-self: center;
  margin-top: calc(var(--size) / 2 - 1px);
}
```

**推奨: 方法A（疑似要素）。** 3ステップ固定で追加 HTML 不要。完了ラインの色変更も `::after` の background で制御可能。

### 1-5. アクセシビリティ

| 要件 | 実装 |
|---|---|
| 現在のステップ | `aria-current="step"` を `<li>` または `<a>` に設定 |
| 完了の通知 | `<span class="sr-only">完了</span>` を完了ステップ内に追加 |
| 順序の伝達 | `<ol>` 要素で暗黙的に順序を示す |
| ステッパー全体 | `aria-label="予想ライブのフェーズ"` を `<nav>` に |
| フォーカス | `:focus-visible` でキャラカラーまたはアクセントカラーのリング |
| 非表示装飾 | コネクタラインの疑似要素は自動的に AT から除外 |

スクリーンリーダーでの読み上げ例: 「ステップ 1、告知、完了。ステップ 2、予想公開、現在のステップ。ステップ 3、結果。」

---

## 2. フェーズによるコンテンツ切り替え

### 2-1. 現行の方式

現行は `livePhaseBody(phaseId, race)` で条件分岐し、`app.innerHTML` にフェーズ全体を再描画する方式。DOM を丸ごと差し替えるため、フェーズ切り替え時にちらつきが発生しうる。

### 2-2. View Transitions API を使った改善

2025年10月に Baseline Newly Available になった View Transitions API を活用し、フェーズ切り替え時にスムーズなクロスフェードを実現する。

```javascript
function switchPhase(newPhaseId) {
  const updateDOM = () => {
    const race = liveRace();
    // フェーズナビの状態更新
    document.querySelectorAll('.phase-stepper__item').forEach(item => {
      item.classList.remove('is-current', 'is-completed', 'is-pending');
    });
    updateStepperState(newPhaseId);
    
    // フェーズ本文の差し替え
    const body = document.getElementById('phase-body');
    body.innerHTML = livePhaseBody(newPhaseId, race);
  };

  // View Transitions API 対応ブラウザ
  if (document.startViewTransition) {
    document.startViewTransition(updateDOM);
  } else {
    // フォールバック: 即時切り替え
    updateDOM();
  }
}
```

**CSS でトランジションをカスタマイズ:**
```css
/* フェーズ本文にビュー遷移名を付与 */
#phase-body {
  view-transition-name: phase-content;
}

/* デフォルトのクロスフェード時間を調整 */
::view-transition-old(phase-content) {
  animation: fade-out 150ms ease;
}
::view-transition-new(phase-content) {
  animation: fade-in 150ms ease;
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* reduced-motion */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(phase-content),
  ::view-transition-new(phase-content) {
    animation-duration: 0.01ms;
  }
}
```

### 2-3. フォールバック（View Transitions 非対応ブラウザ）

```javascript
function fadeSwitch(container, renderFn) {
  if (document.startViewTransition) {
    document.startViewTransition(() => { container.innerHTML = renderFn(); });
    return;
  }
  // CSS transition フォールバック
  container.style.opacity = '0';
  container.addEventListener('transitionend', function handler() {
    container.removeEventListener('transitionend', handler);
    container.innerHTML = renderFn();
    requestAnimationFrame(() => { container.style.opacity = '1'; });
  }, { once: true });
}
```

```css
#phase-body {
  transition: opacity 150ms ease;
}
```

### 2-4. URLハッシュとの連動

現行は `#/live/<phase_route>` で各フェーズにディープリンク可能。これは維持すべき良い設計。フェーズ切り替え時のフロー:

```
ユーザーがステッパーをクリック
  → location.hash 変更
  → hashchange イベント発火
  → router が renderLive(param) を呼ぶ
  → resolveLivePhase(param) でフェーズ決定
  → DOM 更新（View Transitions 経由）
```

**改善ポイント:** 現行は `renderLive()` がページ全体（ヒーロー含む）を再描画しているが、フェーズ切り替え時はフェーズ本文のみを差し替えるよう最適化すべき。ヒーローのタイトルやリードテキストはフェーズごとに異なるため、それらも更新対象に含めるが、背景画像やメタ情報は再描画しない。

### 2-5. 空状態のデザイン

**レース未登録時:**
```html
<section class="empty-state" role="status">
  <div class="empty-state__icon" aria-hidden="true">
    <!-- 馬のシルエットやカレンダーアイコン -->
    <svg>...</svg>
  </div>
  <h2 class="empty-state__title">次のレースはまだ未定です</h2>
  <p class="empty-state__description">
    対象レースが決まり次第、ここに告知が表示されます。
  </p>
  <a href="#/results" class="button secondary">過去の成績を見る</a>
</section>
```

**空状態のデザイン原則:**
| 原則 | 適用 |
|---|---|
| なぜ空かを説明 | 「次のレースはまだ未定」（原因が明確） |
| 次のアクションを提示 | 過去の成績やキャラ一覧への導線 |
| ビジュアルで和らげる | アイコンやイラストで空白を埋める |
| 44px+ タッチターゲット | モバイルでの CTA ボタン |

```css
.empty-state {
  text-align: center;
  padding: var(--space-lg) var(--space-md);
  max-width: 400px;
  margin: 0 auto;
}
.empty-state__icon {
  width: 80px;
  height: 80px;
  margin: 0 auto var(--space-md);
  opacity: 0.4;
}
.empty-state__title {
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  margin-bottom: var(--space-sm);
}
.empty-state__description {
  color: var(--text-muted);
  margin-bottom: var(--space-md);
}
```

---

## 3. フェーズ別の情報密度設計（漸進的開示）

### 3-1. 漸進的開示の原則

Progressive Disclosure（漸進的開示）は、ユーザーに必要な情報を段階的に提示することで認知負荷を軽減するUIパターン。k-ba-man の3フェーズは、時系列に沿って情報が増えていく自然な漸進的開示になっている。

| フェーズ | 情報量 | 主要コンテンツ | 視覚的密度 |
|---|---|---|---|
| 告知 | 最小 | レース概要 + 10人の待機状態 | 余白多め、1カラム中心 |
| 予想公開 | 高 | 集合知パネル + 10人の個別予想 | 2カラムグリッド、カード密集 |
| 結果 | 最高 | 着順 + 収支 + 答え合わせ + ランク変動 | テーブル + カード + 統計 |

### 3-2. 告知フェーズのレイアウト

```
┌─────────────────────────────────┐
│  [ステッパー: 告知(●) → 予想 → 結果]  │
├─────────────────────────────────┤
│                                 │
│  ┌───────────────────────────┐  │
│  │  レース名 / 発走 / 条件   │  │
│  │  （統計タイル 3-4列）      │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌─────────────┐               │
│  │  レース紹介  │               │
│  │  テキスト    │               │
│  │  ＋CTA      │               │
│  └─────────────┘               │
│                                 │
│  ┌─キャラグリッド──────────┐     │
│  │ 10人の「待機中」カード  │     │
│  │ （mini.png + 名前のみ） │     │
│  └────────────────────────┘     │
│                                 │
└─────────────────────────────────┘
```

設計のポイント:
- 余白を多くし、「まだ始まっていない」静けさを表現
- CTA「予想公開ページへ」で次フェーズへの期待感を作る
- キャラカードは最小情報（mini.png + 名前 + 流派名）で「待機中」の雰囲気

### 3-3. 予想公開フェーズのレイアウト

```
┌─────────────────────────────────┐
│  [ステッパー: 告知(✓) → 予想(●) → 結果]  │
├─────────────────────────────────┤
│                                 │
│  ┌───────── 集合知パネル ──────┐  │
│  │ ◎○▲△ の印一覧            │  │
│  │ 上位馬の確率分布バー       │  │
│  └────────────────────────────┘  │
│                                 │
│  ┌──予想カード──┐ ┌──予想カード──┐│
│  │ 龍之介       │ │ 誠          ││
│  │ ◎/根拠/自信 │ │ ◎/根拠/自信 ││
│  │ [対立]       │ │             ││
│  └──────────────┘ └──────────────┘│
│  ┌──予想カード──┐ ┌──予想カード──┐│
│  │ 美咲         │ │ 健太        ││
│  │ ...          │ │ ...         ││
│  └──────────────┘ └──────────────┘│
│  （計10枚、2列 × 5行）          │
│                                 │
└─────────────────────────────────┘
```

設計のポイント:
- 集合知パネルは最上部に固定的な位置。個別予想との対比の基準
- 2列グリッドでカードを並べる（デスクトップ/タブレット）
- 対立マーカーを持つカードは視覚的に区別（§ ranking-drama 参照）
- モバイルでは1列、デフォルト折りたたみ

### 3-4. 結果フェーズのレイアウト

```
┌─────────────────────────────────┐
│  [ステッパー: 告知(✓) → 予想(✓) → 結果(●)]│
├─────────────────────────────────┤
│                                 │
│  ┌────── 結果サマリー ─────────┐ │
│  │ 着順: 1着-2着-3着           │ │
│  │ 集合知◎: 的中/外れ         │ │
│  │ 収支: +XXX円 / -XXX円      │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌───── 勝ち筋ナラティブ ─────┐ │
│  │ 「スローペースから直線勝負   │ │
│  │  となり、差し馬が台頭」     │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌──答え合わせカード──┐ ┌──...──┐│
│  │ 龍之介             │ │ 誠   ││
│  │ ◎: 3着内 ✓        │ │ ◎: 外││
│  │ 直近3戦: ✓✓✗      │ │      ││
│  │ ランク変動: ↑2     │ │      ││
│  └────────────────────┘ └──────┘│
│                                 │
│  ┌──ランク変動テーブル─────────┐ │
│  │ 暫定席次の変動を全員分表示 │ │
│  └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

設計のポイント:
- 最も情報量が多いフェーズ。セクション分けで整理
- 結果サマリー → 勝ち筋（物語）→ 個別答え合わせ → ランク変動の順
- カードには直近3戦のインライン実績バー（ドットインジケータ）

---

## 4. セグメンテッドコントロール（モバイル 620px以下）

### 4-1. 実装パターン

620px 以下ではステッパーをセグメンテッドコントロール（ピルボタン3つ横並び）に切り替える。

```html
<div class="phase-tabs" role="tablist" aria-label="予想ライブのフェーズ">
  <a href="#/live/announce"
     role="tab"
     aria-selected="false"
     class="phase-tabs__tab"
     tabindex="-1">
    告知
  </a>
  <a href="#/live/predictions"
     role="tab"
     aria-selected="true"
     aria-current="step"
     class="phase-tabs__tab is-active"
     tabindex="0">
    予想
  </a>
  <a href="#/live/result"
     role="tab"
     aria-selected="false"
     class="phase-tabs__tab"
     tabindex="-1">
    結果
  </a>
  <span class="phase-tabs__slider" aria-hidden="true"></span>
</div>
```

### 4-2. CSS

```css
.phase-tabs {
  display: none; /* デスクトップでは非表示 */
  position: relative;
  background: var(--surface-1);
  border-radius: 999px;
  padding: 3px;
  gap: 0;
}

@media (max-width: 620px) {
  .phase-tabs {
    display: flex;
  }
  .phase-stepper {
    display: none; /* モバイルではステッパーを非表示 */
  }
}

.phase-tabs__tab {
  flex: 1;
  text-align: center;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  position: relative;
  z-index: 1;
  transition: color 150ms ease;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.phase-tabs__tab.is-active {
  color: var(--text-primary);
}

/* スライダー（アクティブ背景） */
.phase-tabs__slider {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(100% / 3 - 2px);
  height: calc(100% - 6px);
  background: var(--surface-2);
  border-radius: 999px;
  transition: transform 200ms ease;
}

/* スライダーの位置をデータ属性で制御 */
.phase-tabs[data-active="1"] .phase-tabs__slider {
  transform: translateX(calc(100% + 2px));
}
.phase-tabs[data-active="2"] .phase-tabs__slider {
  transform: translateX(calc(200% + 4px));
}

@media (prefers-reduced-motion: reduce) {
  .phase-tabs__slider {
    transition-duration: 0.01ms;
  }
}
```

### 4-3. JS でのスライダー制御

```javascript
function updatePhaseTabSlider(activeIndex) {
  const tabs = document.querySelector('.phase-tabs');
  if (tabs) {
    tabs.dataset.active = activeIndex;
  }
}
```

### 4-4. キーボードナビゲーション（ロービング tabindex）

```javascript
function initPhaseTabs() {
  const tablist = document.querySelector('.phase-tabs[role="tablist"]');
  if (!tablist) return;

  const tabs = [...tablist.querySelectorAll('[role="tab"]')];

  tablist.addEventListener('keydown', (e) => {
    const currentIndex = tabs.indexOf(document.activeElement);
    let nextIndex;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    tabs[currentIndex].tabIndex = -1;
    tabs[nextIndex].tabIndex = 0;
    tabs[nextIndex].focus();
    // ハッシュ変更でフェーズ切り替えが自動発火
    tabs[nextIndex].click();
  });
}
```

### 4-5. アクセシビリティ注記

- `role="tablist"` + `role="tab"` でタブUI の意味を伝える
- `aria-selected="true"` でアクティブなタブを示す
- ロービング tabindex で Tab キーではタブリストに1回だけフォーカス、矢印キーでタブ間移動
- `aria-current="step"` はステッパーとセグメンテッドコントロールで共通

---

## 5. リアルタイム感の演出

### 5-1. 静的SPAでの「ライブ感」テクニック

k-ba-man は静的SPA（サーバーなし）であり、リアルタイム更新は技術的に不可能。しかし、以下のテクニックで「ライブ感」を演出できる:

#### 5-1-1. フェーズバッジ / ステータスピル

```html
<span class="phase-badge phase-badge--live">
  <span class="phase-badge__dot" aria-hidden="true"></span>
  予想公開中
</span>
```

```css
.phase-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.phase-badge--live {
  background: color-mix(in oklch, var(--color-semantic-hit) 15%, transparent);
  color: var(--color-semantic-hit);
}
.phase-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  /* 控えめなパルスアニメーション */
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@media (prefers-reduced-motion: reduce) {
  .phase-badge__dot {
    animation: none;
  }
}
```

**注意:** パルスアニメーションは「予想公開中」フェーズのみ使用。告知・結果フェーズでは静的ドットに。リアルタイムを偽装するのではなく、「現在のフェーズ」を視覚的に強調する用途。

#### 5-1-2. 最終更新日時の表示

```html
<footer class="freshness-footer">
  <p class="freshness-marker">
    <time datetime="2026-06-21T09:30:00+09:00">2026年6月21日 9:30 更新</time>
    <span class="freshness-note">データ更新はページの再読み込みで反映されます</span>
  </p>
</footer>
```

```css
.freshness-marker {
  font-size: var(--font-size-xs);
  color: var(--text-muted);
  text-align: center;
  padding: var(--space-md) 0;
  border-top: 1px solid var(--surface-2);
}
.freshness-marker time {
  display: block;
  margin-bottom: 4px;
}
.freshness-note {
  display: block;
  font-size: 0.75rem;
  opacity: 0.6;
}
```

**デザイン判断:**
- 鮮度マーカーは「控えめ」に。フェーズ本文の最下部に配置
- `<time>` 要素で機械可読な日時を提供
- 「ページの再読み込みで反映」は一度だけ、目立たない形で伝える

#### 5-1-3. フェーズ遷移の予告

告知フェーズでは「予想公開予定: 当日朝」、予想フェーズでは「結果公開予定: レース後」のように、次フェーズのタイミングを表示する。

```html
<div class="phase-next-hint" aria-live="polite">
  <span class="phase-next-hint__label">次のフェーズ</span>
  <span class="phase-next-hint__value">予想公開（当日朝）</span>
</div>
```

```css
.phase-next-hint {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 8px 16px;
  background: color-mix(in oklch, var(--color-accent) 8%, var(--surface-1));
  border-radius: 8px;
  font-size: var(--font-size-sm);
  margin-top: var(--space-md);
}
.phase-next-hint__label {
  color: var(--text-muted);
  font-weight: 500;
}
.phase-next-hint__value {
  font-weight: 600;
}
```

### 5-2. 「ライブ感」の限界と誠実な設計

静的SPAでのライブ感演出で避けるべきこと:

| 避けるべき | 理由 | 代替 |
|---|---|---|
| リアルタイムカウントダウン | 発走までの秒単位表示は静的データでは不正確 | 「当日朝」「レース後」等の曖昧な表現 |
| 自動更新の示唆 | 「自動的に更新されます」は嘘になる | 「再読み込みで反映」と明記 |
| 過度なパルスアニメーション | 更新がないのに動いている印象を与える | 現在フェーズのみ控えめに |
| 通知バッジの数字 | 新着数を表示できない | フェーズ名のみ表示 |

---

## 6. スポーツ系ライブページの参考パターン

### 6-1. 3フェーズの共通構造（スポーツUI分析）

スポーツのライブスコアページ（ESPN、DAZN等）は以下の3フェーズ構造を持ち、k-ba-man と類似:

| スポーツ | k-ba-man |
|---|---|
| Pre-match（試合前）| 告知（announce） |
| Live（試合中）| 予想公開（predictions） |
| Post-match（試合後）| 結果（result） |

### 6-2. スポーツUIから学べるパターン

#### ヘッダーバーの固定情報
ESPN等のマッチセンターでは、スコアと試合状態のバーがページ上部に固定される。k-ba-man では:
- レース名 + フェーズステータスのバーをフェーズコンテンツの上に固定
- スクロールしてもレース情報が見える

#### フェーズに応じたレイアウト変化

| フェーズ | スポーツUI | k-ba-man での適用 |
|---|---|---|
| Pre-match | チーム情報、スタメン、直近成績 | レース概要、10人の待機カード |
| Live | スコア大きく、イベントログ、統計 | 集合知パネル大きく、10人の予想カード |
| Post-match | スコア確定、ハイライト、統計詳細 | 着順確定、勝ち筋ナラティブ、答え合わせ |

#### タブ切り替えの活用
多くのスポーツサイトでは、各フェーズ内でさらにタブ切り替え（Overview / Statistics / Lineups / Timeline）を持つ。k-ba-man では結果フェーズの情報量が多いため、結果フェーズ内でのタブ切り替え（サマリー / 個別答え合わせ / ランク変動）も検討に値する。

### 6-3. Match Centre のUXパターン（Sportmonks の分析より）

- **Pre-match**: ユーザーはコンテキストを求めている。マッチアップの理解に必要な情報（参加者、会場、状態、予測）を提供
- **Live**: 「今この瞬間」に集中。スコア、イベントログ、どちらが優勢かの可視化
- **Post-match**: 統計とリプレイ。イベント、ピリオド、スコア、統計、ラインナップ

k-ba-man への変換:
- **告知**: レースのコンテキスト。出走馬、コース条件、10人が準備に入っている状態
- **予想**: 10人の予想を「ライブ」として展開。集合知との対比が「試合の流れ」に相当
- **結果**: 着順確定後の振り返り。各予想屋の的中/外れが「選手のパフォーマンス統計」に相当

---

## 7. 実装チェックリスト

### 優先度 P0（デザイン刷新で即対応）

- [ ] ステッパーを `<ol>` + CSS flexbox + 疑似要素コネクタで再構築
- [ ] 3状態（完了/現在/未到達）の視覚的区別を実装
- [ ] `aria-current="step"` を現在フェーズに設定
- [ ] 620px 以下でセグメンテッドコントロールに切り替え
- [ ] 空状態（レース未登録時）のデザインを実装
- [ ] 最終更新日時の鮮度マーカーを追加

### 優先度 P1（UX改善）

- [ ] View Transitions API でフェーズ切り替えのクロスフェード
- [ ] ステッパー/セグメンテッドコントロールのキーボードナビ
- [ ] フェーズ遷移予告の表示
- [ ] 予想公開中フェーズのステータスバッジ（パルスドット）
- [ ] フェーズ切り替え時のフォーカス管理

### 優先度 P2（最適化）

- [ ] フェーズ本文のみ再描画する差分更新（ヒーローは維持）
- [ ] 結果フェーズ内のサブタブ（サマリー / 答え合わせ / ランク変動）
- [ ] 告知フェーズの「待機中」キャラカードの演出

### 優先度 P3（将来）

- [ ] Service Worker によるバックグラウンドデータ更新チェック
- [ ] Push 通知（フェーズ遷移時）

---

## 参考資料

- [Building A Stepper Component — Ahmad Shadeed](https://ishadeed.com/article/stepper-component-html-css/)
- [Step Indicator — U.S. Web Design System (USWDS)](https://designsystem.digital.gov/components/step-indicator/)
- [SegmentedControl Accessibility — Primer](https://primer.style/product/components/segmented-control/accessibility/)
- [ARIA: tab role — MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tab_role)
- [aria-current — aditus.io](https://www.aditus.io/aria/aria-current/)
- [View Transition API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API)
- [CSS View Transitions Finally Cracked The SPA Problem — Medium](https://medium.com/@theabhishek.040/css-view-transitions-finally-cracked-the-spa-problem-in-2025-040300ddd352)
- [Design patterns for sports apps and live event platforms — Ably](https://ably.com/blog/design-patterns-sports-live-events)
- [Knockout Match Centres: Best UX Patterns — Sportmonks](https://www.sportmonks.com/blogs/knockout-match-centres-best-ux-patterns-data-requirements/)
- [Progressive Disclosure — Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/)
- [What Is Progressive Disclosure? — IxDF](https://ixdf.org/literature/topics/progressive-disclosure)
- [Empty State UI Design — Mobbin](https://mobbin.com/glossary/empty-state)
- [Empty States — Carbon Design System](https://carbondesignsystem.com/patterns/empty-states-pattern/)
