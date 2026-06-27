# アクセシビリティ実装パターン調査

design-spec.md §4-6 のアクセシビリティ要件を実現するための知見集。

---

## 1. スキップリンク

### 現状

`site/index.html` に `<a class="skip-link" href="#app">本文へ移動</a>` が既に存在し、ターゲットの `<main id="app" tabindex="-1">` も正しく設定されている。`tabindex="-1"` によりプログラム的フォーカス可能だが Tab 順序には含まれない、という正しい構成。

### 実装パターン

```css
/* visually-hidden だがフォーカス時に表示 */
.skip-link {
  position: absolute;
  top: -100%;
  left: 16px;
  z-index: 9999;
  padding: 12px 24px;
  background: var(--surface-3);
  color: var(--text-primary);
  border: 2px solid var(--accent-focus);
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  transition: top 0.15s ease;
}

.skip-link:focus {
  top: 8px;
  outline: 2px solid var(--accent-focus);
  outline-offset: 2px;
}
```

### 設計判断のポイント

| 判断 | 推奨 | 理由 |
|---|---|---|
| 非表示の方法 | `position: absolute; top: -100%` | `display: none` や `visibility: hidden` はフォーカス順序から除外されるため不可 |
| `clip-path` vs `position` | `position` で十分 | clip-path は古いブラウザで問題になりうるが、`position` は普遍的 |
| ダークテーマでの視認性 | `surface-3`（最前面）+ 明るいボーダー | 背景に埋もれないよう最高階層のサーフェスを使用 |
| 複数スキップ先 | 初期は「本文へ移動」1つ | ナビが4項目と少ないため。将来的にナビが増えた場合は「ナビゲーションを飛ばす」追加を検討 |

---

## 2. ARIA 属性の実践パターン

### 2-1. aria-current="page" によるナビゲーション現在地

ハッシュルーティングの SPA では、ルート変更のたびに JS で `aria-current` を更新する。

```js
function updateNavCurrent(currentPath) {
  const navLinks = document.querySelectorAll('[data-nav]');
  navLinks.forEach(link => {
    const isActive = link.getAttribute('data-nav') === currentPath;
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}
```

```css
[aria-current="page"] {
  color: var(--text-primary);
  border-bottom: 2px solid currentColor;
}
```

**注意**: `aria-current` の値は `page`（現在のページ）、`step`（プロセスのステップ）、`location`（フローチャート内の位置）、`date`（カレンダーの日付）、`true`（汎用）がある。ナビゲーションでは `page` が最適。

### 2-2. aria-label でのアイコンボタン・画像ボタンの補完

```html
<!-- テキストなしのアイコンボタン -->
<button aria-label="前のキャラクターへ" class="nav-prev">
  <svg aria-hidden="true"><!-- 矢印アイコン --></svg>
</button>

<!-- ロゴリンク（既存実装は正しい） -->
<a class="brand" href="#/overview" aria-label="k-ba-man トップへ">
  <span class="brand-mark">K</span>
  ...
</a>
```

**原則**: 視覚的なテキストがある場合は `aria-label` 不要。アイコンのみの要素に必ず付与。SVG アイコン自体は `aria-hidden="true"` で隠す。

### 2-3. aria-live でのソート結果・フェーズ変更通知

```html
<!-- ランキングソート結果の通知 -->
<div class="sr-only" aria-live="polite" id="sort-status"></div>
```

```js
function handleSort(criterion) {
  sortTable(criterion);
  document.getElementById('sort-status').textContent =
    `${criterion}順にソートしました`;
}
```

| 用途 | aria-live の値 | 理由 |
|---|---|---|
| ソート結果 | `polite` | ユーザーの操作後の結果報告。割り込み不要 |
| フェーズ変更（告知→予想→結果） | `polite` | 静的SPAのためリアルタイム更新はなく、ページ読み込み時に状態が確定 |
| エラー通知 | `assertive` | 操作失敗など即座に知らせるべき場合のみ |
| ページ遷移完了 | `polite` | SPA のルート変更後に「{ページ名}を表示しています」と通知 |

**視覚的に隠す通知テキスト**:
```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

**注意**: `aria-live` 領域は DOM に最初から存在させること。動的に追加された `aria-live` 要素は一部のスクリーンリーダーで認識されない。

### 2-4. role="tablist" / role="tab" / role="tabpanel" のタブUI実装

成績ページのランキング/レース別タブ、およびライブページのフェーズナビに使用。

```html
<div role="tablist" aria-label="成績の表示切替">
  <button role="tab"
          id="tab-ranking"
          aria-selected="true"
          aria-controls="panel-ranking"
          tabindex="0">
    ランキング
  </button>
  <button role="tab"
          id="tab-races"
          aria-selected="false"
          aria-controls="panel-races"
          tabindex="-1">
    レース別
  </button>
</div>

<div role="tabpanel"
     id="panel-ranking"
     aria-labelledby="tab-ranking"
     tabindex="0">
  <!-- ランキングの内容 -->
</div>

<div role="tabpanel"
     id="panel-races"
     aria-labelledby="tab-races"
     tabindex="0"
     hidden>
  <!-- レース別の内容 -->
</div>
```

#### ロービング tabindex によるキーボードナビ

```js
function setupRovingTabindex(tablistEl) {
  const tabs = tablistEl.querySelectorAll('[role="tab"]');

  tablistEl.addEventListener('keydown', (e) => {
    const currentIndex = [...tabs].indexOf(document.activeElement);
    let nextIndex;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    tabs[currentIndex].setAttribute('tabindex', '-1');
    tabs[nextIndex].setAttribute('tabindex', '0');
    tabs[nextIndex].focus();
  });
}
```

**設計判断**: W3C APG では「矢印キーでフォーカス移動 + 自動選択」と「矢印キーでフォーカス移動 + Enter/Space で選択」の2方式がある。タブ切替のコストが軽い（DOM の表示/非表示のみ）場合は自動選択を推奨。

### 2-5. role="dialog" + aria-modal のモーダル管理

レース詳細モーダルには `<dialog>` 要素を使用する。`showModal()` で開くと、ブラウザが自動的にフォーカストラップ・Escape での閉じ・背面の `inert` 化を処理する。

```html
<dialog id="race-detail-modal"
        aria-labelledby="modal-title">
  <div class="modal-header" style="position: sticky; top: 0;">
    <h2 id="modal-title">レース詳細</h2>
    <button class="modal-close"
            aria-label="閉じる"
            autofocus>
      <svg aria-hidden="true"><!-- × アイコン --></svg>
    </button>
  </div>
  <div class="modal-body">
    <!-- コンテンツ -->
  </div>
</dialog>
```

```js
const modal = document.getElementById('race-detail-modal');
let previousFocus = null;

function openModal() {
  previousFocus = document.activeElement;
  modal.showModal();
}

function closeModal() {
  modal.close();
  previousFocus?.focus();
}

modal.addEventListener('close', () => {
  previousFocus?.focus();
});

// バックドロップクリックで閉じる
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});
```

#### `<dialog>` の利点（2025-2026 時点）

| 機能 | `<dialog>` + `showModal()` | カスタム実装 |
|---|---|---|
| フォーカストラップ | 自動 | JS で手動管理 |
| Escape で閉じる | 自動（`cancel` イベント） | JS で `keydown` 監視 |
| 背面の無効化 | `inert` 相当を自動付与 | `aria-hidden` + `inert` を手動管理 |
| `::backdrop` 疑似要素 | CSS で直接スタイル可能 | 別の要素が必要 |
| スクリーンリーダー通知 | `role="dialog"` が暗黙的に適用 | `role="dialog"` を手動付与 |

#### `inert` 属性について

`inert` は HTML 属性で、要素とその子孫をインタラクション不能・支援技術から不可視にする。`<dialog>` の `showModal()` は背面に自動的に `inert` 相当の効果を適用するため、手動で `inert` を付ける必要はない。

ただし、カスタムのオーバーレイUIを作る場合や、部分的にコンテンツを無効化する場合には `inert` が有用:

```js
// カスタムオーバーレイの場合
document.querySelector('main').inert = true;
document.querySelector('header').inert = true;
// 閉じるとき
document.querySelector('main').inert = false;
document.querySelector('header').inert = false;
```

#### Safari + VoiceOver の既知の問題

Safari + VoiceOver で `aria-modal="true"` を使用した場合、モーダル内の静的コンテンツが読み上げられない問題が報告されている。`<dialog>` の `showModal()` を使う場合はこの問題を回避できるが、テストは必須。

---

## 3. キーボードナビゲーション

### 3-1. :focus-visible のスタイリング

`:focus-visible` はブラウザがキーボード操作と判断した場合のみフォーカスリングを表示する。マウスクリック時にはフォーカスリングが表示されないため、ダークテーマでも自然な見た目になる。

```css
/* ベースのフォーカスリセット */
:focus {
  outline: none;
}

/* キーボード操作時のみフォーカスリングを表示 */
:focus-visible {
  outline: 2px solid var(--accent-focus, oklch(0.75 0.15 250));
  outline-offset: 2px;
}

/* カード要素：キャラカラーでフォーカスリングを着色 */
.character-card:focus-visible {
  outline-color: var(--char-color-mid);
  box-shadow: 0 0 0 4px color-mix(in oklch, var(--char-color) 20%, transparent);
}

/* ダークテーマでの高コントラストフォーカスリング */
/* WCAG 2.2 では non-text のコントラスト比 3:1 以上が必要 */
:root {
  --accent-focus: oklch(0.75 0.15 250); /* 明るい青系 — 暗い背景に対して 3:1 以上 */
}
```

**設計判断**: ダークテーマでは明るい色のフォーカスリングが必要。キャラカラーがアクセントに使われるため、フォーカスリングのデフォルト色はキャラカラーと干渉しない青系（色相250付近）を推奨。キャラカードでは `var(--char-color-mid)` を使い、個性を維持。

### 3-2. フォーカストラップ（モーダル内）

`<dialog>` + `showModal()` を使えば自動的にフォーカストラップが効くため、vanilla JS での手動実装は不要。

ただし `showModal()` を使わないカスタムUI（ボトムシート等）の場合のフォールバック:

```js
function trapFocus(containerEl) {
  const focusable = containerEl.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  containerEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}
```

### 3-3. SPA ページ遷移時のフォーカス管理

ハッシュルーティングの SPA では、ページ遷移後にフォーカスを適切に管理する必要がある。

```js
function onRouteChange(pageName) {
  const main = document.getElementById('app');

  // コンテンツをレンダリング
  renderPage(pageName);

  // メインコンテンツにフォーカスを移動
  main.focus();

  // スクリーンリーダーに通知
  const announcer = document.getElementById('route-announcer');
  announcer.textContent = `${pageName}ページを表示しています`;

  // ページトップにスクロール
  window.scrollTo(0, 0);
}
```

```html
<!-- ルート変更の通知用（常にDOMに存在させる） -->
<div id="route-announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>
```

---

## 4. コントラスト比 WCAG AA

### 4-1. 基本要件

| 要素 | WCAG AA 最低比 | 備考 |
|---|---|---|
| 通常テキスト（< 18pt / < 14pt bold） | 4.5:1 | 本文・ラベル・メタ情報 |
| 大テキスト（≥ 18pt / ≥ 14pt bold） | 3:1 | 見出し・キャラ名 |
| UI コンポーネントのボーダー・アイコン | 3:1 | ボタン境界、入力フィールド境界、フォーカスリング |
| 装飾・ブランド要素 | 要件なし | ゲートストライプは装飾として扱える |

### 4-2. ダークテーマでの実践的な明度設計

OKLCH 色空間を使うと、明度（L）を直感的に管理できる:

```css
:root {
  /* 背景階層 */
  --surface-0: oklch(0.13 0.008 270);  /* 最暗の背景 */
  --surface-1: oklch(0.17 0.008 270);
  --surface-2: oklch(0.21 0.008 270);
  --surface-3: oklch(0.25 0.008 270);  /* 最前面カード */

  /* テキスト階層 */
  --text-primary:   oklch(0.93 0.01 90);  /* 主要テキスト — surface-0 に対して約 13:1 */
  --text-secondary: oklch(0.75 0.01 90);  /* 補助テキスト — surface-0 に対して約 6.5:1 */
  --text-muted:     oklch(0.60 0.01 90);  /* 控えめテキスト — surface-0 に対して約 4.5:1（AA ギリギリ） */
  --text-disabled:  oklch(0.45 0.005 90); /* 非活性テキスト — AA 未達（意図的） */
}
```

**OKLCH でのコントラスト計算の目安**:
- 背景 L: 0.13 に対して、テキスト L: 0.60 以上で AA 達成（通常テキスト）
- 背景 L: 0.13 に対して、テキスト L: 0.50 以上で AA 達成（大テキスト）
- 正確なコントラスト比は相対輝度に基づくため、OKLCH の L 値だけでは厳密に判断できない。ツールでの検証が必須

### 4-3. キャラカラー（10色）のコントラスト確保戦略

キャラカラーをテキストとして使う場合（名前表示など）と、背景色として使う場合で戦略が異なる。

#### テキストとして使う場合

```css
/* キャラカラーの vivid（100%）がダーク背景に対して AA を満たさない場合、
   明度を引き上げた「アクセシブル版」を用意 */
.char-name {
  /* color-mix で明度を確保 */
  color: color-mix(in oklch, var(--char-color) 100%, oklch(0.75 0 0) 0%);
  /* → 必要に応じて oklch の L 値を個別調整 */
}
```

#### 背景色として使う場合（席番号バッジ等）

```css
.seat-badge {
  background: var(--char-color-vivid);
  color: white; /* or black — コントラスト比で判定 */
}
```

**10色の管理戦略**:

| 方針 | 説明 |
|---|---|
| 色+形状の併用 | 色だけに頼らない。席番号・象徴アイコン・流派名を併記 |
| dim/mid/vivid の3段階 | dim は背景ティント、mid はボーダー・控えめ要素、vivid はバッジ・強調。テキストには vivid のみ、かつ AA 検証済みのもの |
| 色覚多様性テスト | Protanopia / Deuteranopia / Tritanopia の3タイプでシミュレーション。赤-緑が区別できない場合に備え、形状・位置・パターンの差異で識別可能にする |

### 4-4. APCA（Advanced Perceptual Contrast Algorithm）について

WCAG 3.0 で採用予定の APCA は、フォントサイズ・ウェイト・用途を考慮したコントラスト計算を行う。ダークテーマでは WCAG 2.x よりも厳しい基準になる傾向がある（明るいテキスト on 暗い背景は、暗いテキスト on 明るい背景よりもコントラストが低く評価される）。

**APCA が特に有用な場面**:
- ダークモードでの薄いテキスト（WCAG 2.x では通るが APCA では不足と判定される場合がある）
- 大きな見出し文字（WCAG 2.x の 3:1 では甘すぎる場合がある）

**ツール**:
- [APCA Contrast Calculator](https://apcacontrast.com/) — APCA 値を直接計算
- [Atmos Style Contrast Checker](https://atmos.style/contrast-checker) — WCAG 2 と APCA の両方で OKLCH カラーをチェック
- [InclusiveColors](https://www.inclusivecolors.com/) — OKLCH + APCA 対応のパレット生成

### 4-5. 現行実装の問題点

`site/styles.css` の `--muted`（`#8a8a8a` / `#999`）は背景 `#0e0e12` に対して AA を満たしていない可能性がある。リニューアル時に OKLCH ベースのテキスト階層に移行し、全テキスト色の AA 準拠を保証する必要がある。

---

## 5. 画像の alt テキスト

### 5-1. キャラクター立ち絵の alt テキスト設計

```html
<!-- キャラクター一覧カード: 意味のある画像 -->
<img src="assets/characters/tatsunosuke/real.png"
     alt="龍之介 — 巻物を持つ和装の青年"
     width="300" height="450">

<!-- ランキング行のミニアイコン: 意味のある画像（名前が近くにない場合） -->
<img src="assets/characters/tatsunosuke/mini.png"
     alt="龍之介"
     width="44" height="44"
     class="rank-avatar">

<!-- ランキング行のミニアイコン: 名前が隣接テキストにある場合は装飾 -->
<img src="assets/characters/tatsunosuke/mini.png"
     alt=""
     width="44" height="44"
     class="rank-avatar">
<!-- ↑ テーブル行に名前が別途表示されている場合、重複を避けるため alt="" -->
```

### 5-2. 判別ガイドライン

| 画像の種類 | alt の扱い | 例 |
|---|---|---|
| キャラカード内の立ち絵 | `alt="名前 — 外見の簡潔な描写"` | `"美咲 — 指し棒を持つ分析官風の女性"` |
| ランキング行のアバター（名前隣接） | `alt=""` | テキストで名前が表示済み |
| ランキング行のアバター（名前なし） | `alt="名前"` | 名前の情報がない文脈 |
| プロフィールヒーロー | `alt="名前の全身立ち絵"` | `"龍之介の全身立ち絵"` |
| ヒーロー背景画像 | CSS background で装飾扱い or `alt=""` | 雰囲気演出の背景 |
| 集合ビジュアル | `alt="k-ba-manの10人の予想屋キャラクター集合イラスト"` | OGP用にも流用 |
| 象徴アイコン（巻物・タブレット等） | `alt=""` + 近くにテキストラベル | 装飾的。流派名がテキストで表示されている |
| ゲートストライプ | `alt=""` | 純粋な装飾 |

### 5-3. alt テキストの原則

1. **「何が写っているか」ではなく「なぜこの画像があるか」を書く** — キャラカードの立ち絵は「キャラの個性を伝える」ためにあるので、外見の特徴を簡潔に含める
2. **冗長にしない** — `"龍之介の画像"` ではなく `"龍之介"` で十分。「画像」「写真」「イラスト」はスクリーンリーダーが `<img>` 要素であることを既に伝えるため不要（ただし「全身立ち絵」は構図の情報として有用）
3. **重複を避ける** — 同じ情報がテキストで隣接している場合は `alt=""` にして装飾扱い
4. **キャラ固有の外見的特徴を含める** — 10人が並ぶ一覧では、色だけでなく「巻物を持つ和装の青年」「タブレットを操作するメガネの男性」など、視覚的に区別できる情報を入れる

---

## 6. k-ba-man 固有のアクセシビリティ設計判断

### 6-1. ランキングテーブル

```html
<table aria-label="暫定ランキング">
  <caption class="sr-only">暫定スコア順の予想屋ランキング</caption>
  <thead>
    <tr>
      <th scope="col">席次</th>
      <th scope="col">
        <button aria-label="暫定スコアでソート（現在の並び順）"
                aria-sort="descending">
          暫定スコア
        </button>
      </th>
      <!-- ... -->
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>1</td>
      <td>
        <img src="..." alt="" width="44" height="44">
        龍之介
      </td>
      <td>72.3</td>
      <!-- ... -->
    </tr>
  </tbody>
</table>
```

- `aria-sort` はソート中のカラムに付与（`ascending` / `descending` / `none`）
- ソート結果は `aria-live="polite"` で通知
- モバイルでテーブルをカード化する場合、各項目に視覚的ラベルが必要（`<th>` がなくなるため）

### 6-2. フェーズ表示（告知→予想→結果）

```html
<!-- プログレス的だが操作するUIではないので、テキストで十分 -->
<div class="phase-indicator" aria-label="現在のフェーズ: 予想公開">
  <span aria-hidden="true" class="phase-step completed">告知</span>
  <span aria-hidden="true" class="phase-step current">予想</span>
  <span aria-hidden="true" class="phase-step">結果</span>
</div>
<!-- スクリーンリーダーは aria-label のみ読む -->
```

ただし、フェーズをタブとして操作可能にする場合は `role="tablist"` パターンに切り替える。

### 6-3. 降格圏の視覚表現

降格圏（8-10位）の視覚的演出は、色だけでなくテキスト情報でも伝える:

```html
<tr class="relegation-zone" aria-label="降格圏">
  <td>
    <span class="rank-number">10</span>
    <span class="sr-only">（降格圏）</span>
  </td>
  <!-- ... -->
</tr>
```

### 6-4. 印記号（◎○▲△）のアクセシビリティ

印記号はテキストとして表示するため、スクリーンリーダーでも読み上げ可能。ただし、読み上げが「にじゅうまる」「まる」等になるため、`aria-label` で意味を補完:

```html
<span aria-label="本命">◎</span>
<span aria-label="対抗">○</span>
<span aria-label="単穴">▲</span>
<span aria-label="連下">△</span>
```

または `<abbr>` を使う方法もあるが、日本語のスクリーンリーダーでは記号の読み上げが一般的に正しいため、過度な補完は不要。実機テストで判断する。

---

## 7. 実装優先度

| 優先度 | 項目 | 理由 |
|---|---|---|
| P0 | スキップリンクのスタイル改善 | 既存だが視覚的フィードバックが不十分な可能性 |
| P0 | `aria-current="page"` のルーティング連動 | ナビの現在地表示はコア体験 |
| P0 | `:focus-visible` のダークテーマ対応 | キーボードユーザーの基本体験 |
| P0 | テキストカラーの AA 準拠検証 | `--muted` の修正が必要 |
| P1 | タブUI の ARIA 属性 + ロービング tabindex | 成績ページの操作性 |
| P1 | `<dialog>` のアクセシブル実装 | レース詳細モーダル |
| P1 | SPA ルート変更時のフォーカス管理 + 通知 | ページ遷移の体験 |
| P1 | alt テキストの設計・適用 | 画像の意味伝達 |
| P2 | ランキングの `aria-sort` + ソート通知 | ソート操作のフィードバック |
| P2 | 印記号の `aria-label` | 実機テストで要否判断 |
| P2 | 降格圏の SR 向けテキスト | 視覚演出の補完 |

---

## 参考リンク

- [WebAIM: Skip Navigation Links](https://webaim.org/techniques/skipnav/)
- [Everything you never wanted to know about visually-hidden (2026)](https://dbushell.com/2026/02/20/visually-hidden/)
- [W3C APG: Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- [MDN: ARIA tab role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/tab_role)
- [MDN: focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/:focus-visible)
- [UXPin: Accessible Modals with Focus Traps (2026)](https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/)
- [W3C APG: Dialog (Modal) Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
- [TPGi: The current state of modal dialog accessibility](https://www.tpgi.com/the-current-state-of-modal-dialog-accessibility/)
- [MDN: ARIA live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)
- [A11y Collective: ARIA Live Complete Guide](https://www.a11y-collective.com/blog/aria-live/)
- [WebAIM: Alternative Text](https://webaim.org/techniques/alttext/)
- [APCA Contrast Calculator](https://apcacontrast.com/)
- [Atmos Style Contrast Checker](https://atmos.style/contrast-checker)
- [InclusiveColors: OKLCH + APCA palette generator](https://www.inclusivecolors.com/)
- [Color Contrast WCAG Guide 2026](https://web-accessibility-checker.com/en/blog/color-contrast-wcag-guide)
- [WebAIM: Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
