# モバイルUIパターン調査メモ

design-spec.md §4-4（レイアウト・モバイルナビ）と §5-6（レース詳細モーダル＝ボトムシート）の実現に必要な技術知見をまとめる。

---

## 1. 底部タブバー（Bottom Tab Bar）

### 1-1. 基本構造

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">

<nav class="bottom-tab-bar" aria-label="メインナビゲーション">
  <a href="#/overview" class="tab-item" aria-current="page">
    <svg class="tab-icon" aria-hidden="true"><!-- アイコン --></svg>
    <span class="tab-label">概要</span>
  </a>
  <a href="#/live" class="tab-item">
    <svg class="tab-icon" aria-hidden="true"><!-- アイコン --></svg>
    <span class="tab-label">ライブ</span>
  </a>
  <a href="#/results" class="tab-item">
    <svg class="tab-icon" aria-hidden="true"><!-- アイコン --></svg>
    <span class="tab-label">成績</span>
  </a>
  <a href="#/characters" class="tab-item">
    <svg class="tab-icon" aria-hidden="true"><!-- アイコン --></svg>
    <span class="tab-label">キャラ</span>
  </a>
</nav>
```

### 1-2. CSS 実装

```css
.bottom-tab-bar {
  display: none; /* デスクトップでは非表示 */
}

@media (max-width: 620px) {
  .bottom-tab-bar {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;

    /* safe-area-inset-bottom 対応 */
    height: calc(60px + env(safe-area-inset-bottom, 0px));
    padding-bottom: env(safe-area-inset-bottom, 0px);

    background: var(--surface-1);
    border-top: 1px solid var(--border-subtle);
  }

  .tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 60px; /* safe-area 分を除いたタップ領域 */
    padding: 6px 0;
    text-decoration: none;
    color: var(--text-muted);
    font-size: 10px;
    transition: color 150ms ease;
    -webkit-tap-highlight-color: transparent;
  }

  .tab-item[aria-current="page"] {
    color: var(--accent-primary);
  }

  .tab-icon {
    width: 24px;
    height: 24px;
  }

  /* main 領域の下マージン確保 */
  main {
    padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px) + 16px);
  }
}
```

### 1-3. safe-area-inset-bottom の要点

| 項目 | 内容 |
|---|---|
| **必須メタタグ** | `<meta name="viewport" content="..., viewport-fit=cover">` がないと `env(safe-area-inset-bottom)` は常に `0` を返す（特に Safari） |
| **env() の書き方** | `env(safe-area-inset-bottom, 0px)` — 第2引数はフォールバック値。未対応ブラウザ向け |
| **calc() との併用** | `height: calc(60px + env(safe-area-inset-bottom, 0px))` — タブバー本体の高さ＋ safe area |
| **iOS** | iPhone X 以降のホームインジケーター領域（約 34px）を回避 |
| **Android** | ジェスチャーナビゲーション搭載端末で有効。ただし一部 WebView では `env()` が `0` を返す場合あり |
| **フォールバック** | env() 未対応時は `0px` が適用され、バー自体は 60px 高さで表示される。ノッチ端末以外では問題なし |

### 1-4. aria-current による現在地表示

- `aria-current="page"` をアクティブなタブの `<a>` 要素に付与
- ハッシュ変更時に JS で更新:

```js
function updateActiveTab() {
  const hash = location.hash || '#/overview';
  document.querySelectorAll('.tab-item').forEach(tab => {
    if (hash.startsWith(tab.getAttribute('href'))) {
      tab.setAttribute('aria-current', 'page');
    } else {
      tab.removeAttribute('aria-current');
    }
  });
}
window.addEventListener('hashchange', updateActiveTab);
```

### 1-5. 注意点

- **タップ領域**: 各タブの最小タップサイズ 44×44px を確保（`flex: 1` で横幅は自動充足、高さ 60px で十分）
- **ラベルの省略**: 4文字以内の短ラベルを使う。spec の「概要 / ライブ / 成績 / キャラ」は収まる
- **ライブ中の強調**: spec §2-3 の「ライブ中は強調表示」は、`.tab-item[data-live]` にドット・バッジ・アニメーションを追加で対応

---

## 2. ボトムシート モーダル（Bottom Sheet）

### 2-1. HTML 構造

```html
<dialog class="bottom-sheet" id="race-detail-modal">
  <div class="bottom-sheet__header">
    <div class="bottom-sheet__drag-handle" aria-hidden="true"></div>
    <button class="bottom-sheet__close" aria-label="閉じる">&times;</button>
  </div>
  <div class="bottom-sheet__body">
    <!-- レース詳細コンテンツ -->
  </div>
</dialog>
```

### 2-2. CSS 実装

```css
/* --- 共通（全幅） --- */
.bottom-sheet {
  border: none;
  padding: 0;
  max-width: 640px;
  width: 100%;
  background: var(--surface-2);
  color: var(--text-primary);
}

.bottom-sheet::backdrop {
  background: rgba(0, 0, 0, 0.5);
}

/* --- デスクトップ: 中央モーダル --- */
@media (min-width: 621px) {
  .bottom-sheet {
    border-radius: 12px;
    margin: auto; /* dialog のデフォルトセンタリング */
    max-height: 85vh;
    overflow-y: auto;
  }
}

/* --- モバイル: ボトムシート --- */
@media (max-width: 620px) {
  .bottom-sheet {
    margin: 0;
    margin-top: auto; /* 下端に寄せる */
    max-height: 92vh;
    width: 100%;
    max-width: 100%;
    border-radius: 16px 16px 0 0;
    overflow-y: auto;
    overscroll-behavior: contain; /* スクロールチェーン防止 */
  }

  /* スライドアップアニメーション */
  .bottom-sheet[open] {
    animation: slide-up 250ms ease-out;
  }

  @keyframes slide-up {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }

  /* prefers-reduced-motion 対応 */
  @media (prefers-reduced-motion: reduce) {
    .bottom-sheet[open] {
      animation: none;
    }
  }
}

/* --- ドラッグハンドル --- */
.bottom-sheet__drag-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--text-muted);
  opacity: 0.4;
  margin: 8px auto 0;
}

/* --- 閉じるボタン（sticky） --- */
.bottom-sheet__header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 16px;
}

.bottom-sheet__close {
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-muted);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bottom-sheet__body {
  padding: 16px 20px 24px;
}
```

### 2-3. JS 制御

```js
const modal = document.getElementById('race-detail-modal');

function openBottomSheet() {
  modal.showModal();
}

function closeBottomSheet() {
  modal.close();
}

// 閉じるボタン
modal.querySelector('.bottom-sheet__close').addEventListener('click', closeBottomSheet);

// backdrop クリックで閉じる
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeBottomSheet();
});
```

### 2-4. 背面スクロール抑止

**方法A: `<dialog>` の `showModal()` に委ねる（推奨）**

`showModal()` はブラウザにより背面を `inert` にする。Chrome 144+（2025年末）では `overscroll-behavior: contain` を dialog と backdrop に設定するだけで背面スクロールも抑止される。

**方法B: body overflow: hidden（クロスブラウザ対応）**

```js
function openBottomSheet() {
  document.documentElement.style.overflow = 'hidden';
  // scrollbar-gutter でスクロールバー幅変動を防止
  document.documentElement.style.scrollbarGutter = 'stable';
  modal.showModal();
}

function closeBottomSheet() {
  modal.close();
  document.documentElement.style.overflow = '';
  document.documentElement.style.scrollbarGutter = '';
}
```

**方法C: CSS :has() のみ（JS 不要。Chrome/Safari 対応、Firefox 121+）**

```css
html:has(dialog[open].bottom-sheet) {
  overflow: hidden;
  scrollbar-gutter: stable;
}
```

### 2-5. 重要ポイント

| 項目 | 推奨 |
|---|---|
| **`<dialog>` vs `<div>`** | `<dialog>` の `showModal()` を使う。フォーカストラップ、Esc キー閉じ、backdrop が標準で得られる |
| **`margin-top: auto`** | `<dialog>` は Flexbox ではなく margin で配置される。`margin: 0; margin-top: auto;` で下端寄せになる |
| **safe-area** | ボトムシートは画面下端から出現するため、コンテンツ末尾に `padding-bottom: env(safe-area-inset-bottom, 0px)` を追加 |
| **スクロール位置保存** | body overflow: hidden 方式では、モーダル開閉時に `scrollY` を保存・復元しないと位置がジャンプする場合がある |
| **閉じるアニメーション** | dialog の `close` イベント発火後に要素が即消滅する。閉じアニメーションを付けるには `close` イベントを `preventDefault()` し自前で制御するか、`@starting-style`（Chrome 117+）を使う |

---

## 3. セグメンテッドコントロール

### 3-1. HTML 構造

```html
<div class="segmented-control" role="tablist" aria-label="フェーズ切り替え">
  <button role="tab"
          id="tab-announce"
          aria-selected="true"
          aria-controls="panel-announce"
          tabindex="0"
          class="segment">
    告知
  </button>
  <button role="tab"
          id="tab-predictions"
          aria-selected="false"
          aria-controls="panel-predictions"
          tabindex="-1"
          class="segment">
    予想
  </button>
  <button role="tab"
          id="tab-result"
          aria-selected="false"
          aria-controls="panel-result"
          tabindex="-1"
          class="segment">
    結果
  </button>
</div>

<div role="tabpanel" id="panel-announce" aria-labelledby="tab-announce">
  <!-- 告知コンテンツ -->
</div>
<div role="tabpanel" id="panel-predictions" aria-labelledby="tab-predictions" hidden>
  <!-- 予想コンテンツ -->
</div>
<div role="tabpanel" id="panel-result" aria-labelledby="tab-result" hidden>
  <!-- 結果コンテンツ -->
</div>
```

### 3-2. CSS 実装

```css
.segmented-control {
  display: inline-flex;
  background: var(--surface-1);
  border-radius: 9999px; /* ピル型 */
  padding: 3px;
  gap: 2px;
}

.segment {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 9999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
  white-space: nowrap;
  min-width: 0;
}

.segment[aria-selected="true"] {
  background: var(--surface-3);
  color: var(--text-primary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.segment:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}

/* prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .segment {
    transition: none;
  }
}
```

### 3-3. JS: ロービング tabindex + 矢印キーナビ

```js
function initSegmentedControl(container) {
  const tabs = Array.from(container.querySelectorAll('[role="tab"]'));

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) activateTab(tabs, tab);
  });

  container.addEventListener('keydown', (e) => {
    const current = tabs.indexOf(document.activeElement);
    if (current === -1) return;

    let next;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (current + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (current - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    activateTab(tabs, tabs[next]);
    tabs[next].focus();
  });
}

function activateTab(tabs, activeTab) {
  tabs.forEach(tab => {
    const isActive = tab === activeTab;
    tab.setAttribute('aria-selected', isActive);
    tab.setAttribute('tabindex', isActive ? '0' : '-1');

    const panelId = tab.getAttribute('aria-controls');
    const panel = document.getElementById(panelId);
    if (panel) panel.hidden = !isActive;
  });
}
```

### 3-4. アクセシビリティ要件まとめ

| 要件 | 実装 |
|---|---|
| **role="tablist"** | コンテナに付与。`aria-label` でコントロールの目的を説明 |
| **role="tab"** | 各ボタンに付与。`aria-selected` で状態を明示 |
| **role="tabpanel"** | 対応するコンテンツ領域。`aria-labelledby` でタブと紐付け |
| **ロービング tabindex** | アクティブタブのみ `tabindex="0"`、他は `-1`。Tab キーでコントロールに入り、矢印キーで移動 |
| **矢印キー** | ArrowLeft/Right で巡回。Home/End で先頭/末尾 |
| **非アクティブパネル** | `hidden` 属性で非表示。`display: none` と同等で支援技術からも隠れる |

---

## 4. prefers-reduced-motion 全般指針

### 4-1. 推奨アプローチ: モーションなしをデフォルトに（opt-in パターン）

```css
/* ベース: モーションなし */
.card {
  /* transition なし */
}

/* モーション OK な環境でのみアニメーション追加 */
@media (prefers-reduced-motion: no-preference) {
  .card {
    transition: transform 150ms ease, box-shadow 150ms ease;
  }
  .card:hover {
    transform: translateY(-2px);
  }
}
```

この方式のメリット:
- reduced-motion ユーザーが最初のフレームでアニメーションを一瞬見てしまう（FOUC）のを防げる
- デフォルトが安全側に倒れる

### 4-2. 残してよいモーション

- **色の変化**: `background-color` や `opacity` のフェードは vestibular trigger にならないため、reduced-motion でも残してよい
- **即時フィードバック**: `:active` のスケールダウンなど、ユーザー操作に直結する 0ms〜50ms の反応は残す
- **レイアウト変更の補間**: コンテンツが突然ジャンプするより、短い opacity フェード（100ms）で切り替えたほうがむしろ認知しやすい場合がある

### 4-3. CSS カスタムプロパティで一元管理

```css
:root {
  --duration-fast: 150ms;
  --duration-medium: 250ms;
  --ease-default: ease;
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-fast: 0ms;
    --duration-medium: 0ms;
  }
}

/* コンポーネントでは変数を参照 */
.card {
  transition: transform var(--duration-fast) var(--ease-default);
}
```

---

## 5. 実装上の判断ポイント

| 判断 | 推奨 | 理由 |
|---|---|---|
| 底部バーの表示切替ブレイクポイント | `620px` | spec §4-4 の指定どおり。`matchMedia` でも CSS メディアクエリでも同一値を使う |
| dialog の位置揃え | `margin-top: auto` | Flexbox ではなく margin ベース。`<dialog>` のデフォルト配置仕様に沿う |
| backdrop クリックの閉じ判定 | `e.target === modal` | dialog の padding 領域クリックが backdrop と混同されないよう、dialog 内コンテンツは子要素でラップ |
| スクロール復帰 | `scrollY` を保存 | `overflow: hidden` にすると scroll position が失われうるため、開閉時に保存・復帰する |
| セグメンテッドコントロール vs タブ | 意味的にはタブ | 3フェーズの切り替えは ARIA tab パターンそのもの。見た目がピル型でも role="tablist" を使う |
| ボトムシートの閉じアニメーション | 初期は省略可 | `dialog.close()` 後の退場アニメーションは `@starting-style` が必要で Safari 未対応（2026年6月時点）。初期はフェードアウトなしでも UX 的に許容範囲 |

---

## 参考ソース

- [MDN: env() CSS function](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env)
- [MDN: `<dialog>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog)
- [MDN: ARIA tab role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tab_role)
- [Frontend Masters: Scroll-Locked Dialogs](https://frontendmasters.com/blog/scroll-locked-dialogs/)
- [CSS-Tricks: Prevent Page Scrolling When a Modal is Open](https://css-tricks.com/prevent-page-scrolling-when-a-modal-is-open/)
- [W3C APG: Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
- [Pope Tech: Accessible Animation](https://blog.pope.tech/2025/12/08/design-accessible-animation-and-movement/)
- [Samuel Kraft: Bottom Tab Bars on Safari iOS 15](https://samuelkraft.com/blog/safari-15-bottom-tab-bars-web)
- [CSS Safe Area Insets Guide](https://theosoti.com/short/safe-area-inset/)
- [UXPin: Keyboard Navigation Patterns (2026)](https://www.uxpin.com/studio/blog/keyboard-navigation-patterns-complex-widgets/)
- [GeeksforGeeks: Draggable Bottom Sheet Modal](https://www.geeksforgeeks.org/javascript/create-a-draggable-bottom-sheet-modal-in-html-css-javascript/)
- [GitHub Primer: SegmentedControl Accessibility](https://primer.style/product/components/segmented-control/accessibility/)
