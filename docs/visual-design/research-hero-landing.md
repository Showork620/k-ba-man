# ヒーローセクション＆ランディングデザインパターン調査

design-spec §5-1〜§5-5 のヒーロー領域、及び §4-8 ゲートストライプの実現に必要な知見。

---

## 1. フルブリードヒーローセクション

### 1-1. 層構造（現行実装の分析と改善）

現行 `styles.css` のヒーロー（`.hero-band`）は既に以下の3層構造を持つ:

| 層 | 要素 | 役割 |
|---|---|---|
| 最背面 | `::before` + `--hero-bg` | 背景画像 + グラデーションオーバーレイ |
| コンテンツ | `.hero-copy`（z-index: 1） | テキスト + CTA |
| 最前面 | `::after` | 10色ゲートストライプ |

この構造は堅実。改善点は以下:

### 1-2. 背景暗化テクニック比較

| 手法 | メリット | デメリット | k-ba-man での判定 |
|---|---|---|---|
| **gradient overlay（現行）** | 方向制御可、テキスト側を濃く画像側を薄くできる | 画像の彩度が落ちる | **採用（継続）** |
| mix-blend-mode: multiply | 自然な暗化、彩度を保つ | 色の予測が難しい、ブラウザ差 | 不採用 |
| opacity で暗化 | シンプル | テキストにも影響（分離が必要） | 不採用 |
| backdrop-filter: brightness() | テキスト背面だけ暗化可能 | Safari 対応差、パフォーマンス | 将来検討 |

**現行実装の改善ポイント:**

```css
/* 現行: rgba でハードコード */
.hero-band::before {
  background:
    linear-gradient(90deg,
      rgba(11, 12, 17, 0.78) 0%,
      rgba(11, 12, 17, 0.3) 42%,
      rgba(11, 12, 17, 0.02) 100%),
    linear-gradient(0deg,
      rgba(11, 12, 17, 0.48) 0%,
      rgba(11, 12, 17, 0) 64%),
    var(--hero-bg);
}

/* 改善案: CSS custom properties で管理 */
.hero-band::before {
  --overlay-strong: oklch(0.11 0.008 260 / 0.82);
  --overlay-mid:    oklch(0.11 0.008 260 / 0.35);
  --overlay-none:   oklch(0.11 0.008 260 / 0);
  background:
    linear-gradient(90deg,
      var(--overlay-strong) 0%,
      var(--overlay-mid) 42%,
      var(--overlay-none) 100%),
    linear-gradient(0deg,
      oklch(0.11 0.008 260 / 0.5) 0%,
      var(--overlay-none) 64%),
    var(--hero-bg);
  background-position: center;
  background-size: cover;
}
```

**設計原則:**
- 左側（テキスト側）は 75-85% 不透明度で文字の可読性を確保
- 右側（画像側）は 0-5% で背景アートを見せる
- 下端は 40-50% でゲートストライプとの境界をぼかす
- WCAG AA: オーバーレイ上のテキストが 4.5:1 以上のコントラスト比を維持すること

### 1-3. テキスト可読性の追加保証

背景画像が変わっても可読性を保つためのフォールバック:

```css
.hero-copy {
  position: relative;
  z-index: 1;
  /* テキストにわずかなドロップシャドウを追加 */
  text-shadow: 0 1px 3px oklch(0.11 0.008 260 / 0.6);
}

.hero-band h1 {
  /* 大見出しにはより強いシャドウ */
  text-shadow:
    0 2px 8px oklch(0.11 0.008 260 / 0.7),
    0 0 40px oklch(0.11 0.008 260 / 0.3);
}
```

### 1-4. ヒーロー最小高さの設計

```css
.hero-band {
  /* 現行: min-height: min(620px, calc(100dvh - 68px)); — 良い */
  /* 改善案: dvh を使い、ヘッダー高さを CSS 変数化 */
  --header-h: 68px;
  min-height: min(620px, calc(100dvh - var(--header-h)));

  /* モバイルでは高さを抑える（CTA がファーストビューに入るように） */
  @media (max-width: 620px) {
    min-height: min(480px, calc(100dvh - var(--header-h)));
  }
}
```

**dvh vs svh vs vh の選択:**
- `dvh`（dynamic）: アドレスバーの表示/非表示に追従。スクロール時にサイズが変わるためレイアウトシフトの原因になりうる
- `svh`（small）: アドレスバー表示時の高さ。安定しているが、非表示時に余白が生まれる
- 推奨: `min-height` には `dvh` が安全（最小高さなので再レイアウトが起きにくい）

### 1-5. 背景画像のレスポンシブ対応

```css
.hero-band::before {
  background-size: cover;
  background-position: center;
  /* 現行の filter 調整は維持 */
  filter: saturate(1.14) contrast(1.08) brightness(1.08);
}

/* モバイル: 画像の焦点を調整 */
@media (max-width: 620px) {
  .hero-band::before {
    /* キャラクターが右寄りの場合、モバイルでは中央寄せ */
    background-position: 65% center;
  }
}
```

**`<img>` vs `background-image` の判断:**
- ヒーロー背景はコンテンツではなく装飾 → `background-image`（現行）が正しい
- 画像の preload には `<link rel="preload" as="image">` を使う（背景画像は `<img>` の `fetchpriority` が使えないため）

---

## 2. CTA ボタンの配置と階層

### 2-1. 3段階の視覚階層

design-spec では3つの CTA（予想ライブ / 成績 / キャラクター）が必要。優先度に応じた階層設計:

| CTA | 階層 | スタイル | 理由 |
|---|---|---|---|
| 予想ライブ | **Primary** | 塗りつぶし（gold 背景 + 暗色文字） | 「今週のエントリポイント」として最高優先度 |
| 成績 | **Secondary** | ゴーストボタン（border + テキスト） | 重要だが予想ライブより下位 |
| キャラクター | **Tertiary** | テキストリンク + 矢印 | 常時利用できるが CTA としては控えめ |

```css
/* Primary — 現行の .button.primary を継続 */
.button.primary {
  background: var(--gold);
  color: var(--bg);
  border-color: var(--gold);
  font-weight: 700;
  min-height: 48px;
  padding: 0 24px;
}

/* Secondary — 現行の .button.secondary を継続 */
.button.secondary {
  border-color: var(--border-mid);
  color: var(--text);
  background: transparent;
  min-height: 46px;
  padding: 0 20px;
}

/* Tertiary — テキストリンク風 */
.button.tertiary {
  border: none;
  background: none;
  color: var(--gold);
  font-size: 0.88rem;
  padding: 0 4px;
  min-height: 44px;
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-color: oklch(from var(--gold) l c h / 0.3);
}

.button.tertiary:hover {
  color: var(--gold-light);
  text-decoration-color: var(--gold);
  transform: none; /* tertiary はリフトしない */
}
```

### 2-2. レイアウトパターン

```css
.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
  align-items: center;
}

/* デスクトップ: 横一列（primary が左端で最も目立つ） */
/* タブレット: wrap して2行に */
/* モバイル: 縦積み */
@media (max-width: 620px) {
  .hero-actions {
    flex-direction: column;
    align-items: stretch; /* ボタンを全幅に */
    gap: 10px;
  }

  .hero-actions .button.tertiary {
    align-self: center; /* tertiary は中央寄せテキスト */
    width: auto;
  }
}
```

### 2-3. thumb zone 配慮（モバイル）

- primary CTA の `min-height: 48px` はタップターゲットとして十分（Apple HIG: 44px, Material: 48px）
- モバイルで縦積みにする場合、primary を**最上部**に置く（親指の届きやすさより視認優先。ヒーロー内なのでスクロール前の画面上部に位置する）
- ページ末尾やフロートバーでの CTA 配置は、ヒーローとは別に検討

---

## 3. ヒーロー直下の導線帯

### 3-1. 予想ライブバナー

「目立つが邪魔にならない」ためのデザイン戦略:

```html
<!-- ライブデータがある場合のみ JS で挿入 -->
<section class="live-banner" aria-label="今週の予想ライブ">
  <div class="live-banner-inner">
    <span class="live-pulse" aria-hidden="true"></span>
    <div class="live-banner-text">
      <strong>宝塚記念 (G1)</strong>
      <span class="phase-pill">予想公開中</span>
    </div>
    <a href="#/live" class="button primary compact">予想を見る →</a>
  </div>
</section>
```

```css
.live-banner {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 12px clamp(16px, 4vw, 40px);
}

.live-banner-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: var(--max);
  margin: 0 auto;
}

/* 脈打つドット — ライブ感の演出 */
.live-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--green);
  flex-shrink: 0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 oklch(from var(--green) l c h / 0.4); }
  50%      { opacity: 0.7; box-shadow: 0 0 0 6px oklch(from var(--green) l c h / 0); }
}

.phase-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  background: oklch(from var(--green) l c h / 0.12);
  color: var(--green);
  font-family: var(--f-mono);
  font-size: 0.72rem;
  font-weight: 700;
}

.button.compact {
  min-height: 36px;
  padding: 0 16px;
  font-size: 0.82rem;
  margin-left: auto; /* 右寄せ */
}

/* モバイル: コンパクト化 */
@media (max-width: 620px) {
  .live-banner-inner {
    flex-wrap: wrap;
    gap: 8px;
  }
  .button.compact {
    width: 100%;
    margin-left: 0;
  }
}

/* prefers-reduced-motion: pulse を停止 */
@media (prefers-reduced-motion: reduce) {
  .live-pulse {
    animation: none;
  }
}
```

### 3-2. 条件付き表示の実装

```javascript
function renderLiveBanner(container) {
  const liveData = window.__LIVE_RACE__;
  if (!liveData || !liveData.race) {
    // ライブデータなし → バナーを出さない
    return;
  }
  const banner = document.createElement('section');
  banner.className = 'live-banner';
  banner.setAttribute('aria-label', '今週の予想ライブ');
  // ... コンテンツ生成
  container.after(banner); // ヒーロー直後に挿入
}
```

**UX ポイント:**
- バナーが無い場合でもレイアウトシフトが起きないように、ヒーロー下のスペースを固定しない（バナーが追加される形にする）
- 結果フェーズのバナーは「結果を見る」に文言変更

### 3-3.「今週のドラマ」帯

```html
<section class="drama-strip" aria-label="今週の円卓">
  <div class="drama-strip-inner">
    <p class="drama-headline">
      <strong>龍之介</strong>が2つ順位を上げ暫定3位に浮上。
      集合知◎<strong>メイショウタバル</strong>は3着内に入り、円卓の見立てが通った一戦。
    </p>
  </div>
</section>
```

```css
.drama-strip {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  padding: 16px clamp(16px, 4vw, 40px);
}

.drama-strip-inner {
  max-width: var(--max);
  margin: 0 auto;
}

.drama-headline {
  margin: 0;
  font-family: var(--f-serif);
  font-size: clamp(0.88rem, 1.2vw, 1rem);
  color: var(--text);
  line-height: 1.7;
  /* 左にアクセント線 */
  padding-left: 14px;
  border-left: 3px solid var(--gold-dim);
}

.drama-headline strong {
  color: var(--ink);
}
```

---

## 4. サブページヒーロー

### 4-1. 高さの階層設計

| ページ | ヒーロー種別 | 高さ | 背景 |
|---|---|---|---|
| Overview | **フル**ヒーロー | `min(620px, calc(100dvh - 68px))` | 集合ビジュアル |
| キャラクター詳細 | **プロフィール**ヒーロー | `min(480px, 60dvh)` | キャラカラー背景 + 立ち絵 |
| 予想ライブ | **コンパクト**ヒーロー | `auto`（パディングのみ） | なし or ティント |
| 成績 | **コンパクト**ヒーロー | `auto` | なし |
| キャラクター一覧 | **コンパクト**ヒーロー | `auto` | なし or 薄い背景 |

### 4-2. コンパクトヒーロー（`.page-intro`）

現行実装 `.page-intro` は既に良い基盤。改善案:

```css
.page-intro {
  position: relative;
  overflow: hidden;
  padding: clamp(36px, 6vw, 64px) clamp(16px, 4vw, 40px) clamp(18px, 3vw, 32px);
  border-bottom: 1px solid var(--border);
}

/* ビジュアル付きバリアント（キャラ一覧など） */
.page-intro.visual-intro {
  /* 現行の ::before 背景パターンを継続 */
}

/* 情報密度の高いバリアント（成績など） */
.page-intro.data-intro {
  padding-bottom: clamp(12px, 2vw, 20px);
  /* 注意書きなどの追加情報を含むため余白を詰める */
}
```

### 4-3. サブページヒーローの情報構成

```html
<section class="page-intro">
  <p class="eyebrow">RESULTS</p>
  <h1>成績</h1>
  <p class="lead">10人の暫定席次とレースごとの成績を確認する</p>
  <p class="page-meta">
    <span>記録: <strong>5</strong> レース</span>
    <span class="separator" aria-hidden="true">·</span>
    <span>最終更新: 2026-06-22</span>
  </p>
</section>
```

```css
.page-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 12px;
  font-family: var(--f-mono);
  font-size: 0.75rem;
  color: var(--muted);
}

.page-meta strong {
  color: var(--ink);
}

.separator {
  color: var(--faint);
}
```

---

## 5. 10色ゲートストライプ

### 5-1. 現行実装の分析

現行の `.hero-band::after` は `linear-gradient` で10色を等分配置。これは正しいアプローチだが改善余地がある。

### 5-2. 改善: CSS custom properties による管理

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

  /* ゲートストライプ — 一箇所で管理 */
  --gate-stripe: linear-gradient(
    90deg,
    var(--c-tatsunosuke)  0%,  var(--c-tatsunosuke)  10%,
    var(--c-makoto)      10%,  var(--c-makoto)       20%,
    var(--c-misaki)      20%,  var(--c-misaki)       30%,
    var(--c-kenta)       30%,  var(--c-kenta)        40%,
    var(--c-teppei)      40%,  var(--c-teppei)       50%,
    var(--c-sakura)      50%,  var(--c-sakura)       60%,
    var(--c-aoi)         60%,  var(--c-aoi)          70%,
    var(--c-hina)        70%,  var(--c-hina)         80%,
    var(--c-yuko)        80%,  var(--c-yuko)         90%,
    var(--c-goro)        90%,  var(--c-goro)        100%
  );
}
```

### 5-3. ストライプのバリエーション

```css
/* ヒーロー下部（現行位置） — 細い区切り線として */
.hero-band::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gate-stripe);
  pointer-events: none;
  z-index: 2;
}

/* フッター上部 — もう1箇所の使用 */
.site-footer::before {
  content: '';
  display: block;
  height: 3px;
  background: var(--gate-stripe);
  margin-bottom: 32px;
}
```

### 5-4. レスポンシブでの表示

ストライプはレスポンシブで高さを変える必要はない（3-4px の帯はどの画面幅でも視認できる）。ただし:

```css
/* 超狭小画面: 隣接する色が区別しにくくなるため、わずかに高くする */
@media (max-width: 400px) {
  .hero-band::after {
    height: 5px;
  }
}
```

**離散ストライプ vs グラデーション:**
- 現行の hard-stop gradient（各色の境界が明確）は「レースゲート」のメタファーに合致 → **維持**
- ぼかしグラデーションにすると個々のキャラカラーが不明瞭になるため不採用

---

## 6. 動的ヒーロー要素

### 6-1. 首位キャラの強調

首位キャラに応じてヒーローのアクセントが変わる実装:

```javascript
function updateHeroForLeader(heroEl, leaderChar) {
  // CSS custom property でキャラカラーを注入
  heroEl.style.setProperty('--leader-color', leaderChar.color);

  // キャッチコピーの動的更新
  const subtitle = heroEl.querySelector('.hero-leader-note');
  if (subtitle) {
    subtitle.textContent = `現在の暫定首位: ${leaderChar.name}`;
  }
}
```

```css
.hero-band {
  /* リーダーカラーのグロー（任意） */
  --leader-glow: color-mix(in oklch, var(--leader-color, var(--gold)) 15%, transparent);
}

/* ヒーローの装飾要素にリーダーカラーを反映 */
.hero-leader-accent {
  color: var(--leader-color, var(--gold));
  transition: color 400ms ease;
}
```

### 6-2. フェーズに応じた変化

```javascript
function updateHeroForPhase(heroEl, phase) {
  heroEl.dataset.phase = phase; // 'announce' | 'predictions' | 'result'
}
```

```css
/* フェーズに応じた CTA 文言・スタイル変更は JS で */
/* フェーズに応じた色味変化は CSS で */
.hero-band[data-phase="announce"] {
  /* 告知: 落ち着いたトーン */
}

.hero-band[data-phase="predictions"] {
  /* 予想公開: 活気のあるトーン */
  --overlay-strong: oklch(0.11 0.008 260 / 0.75);
}

.hero-band[data-phase="result"] {
  /* 結果: 決着のトーン */
}
```

### 6-3. View Transitions API によるスムーズな更新

SPA でのページ遷移時にヒーローをスムーズに差し替える:

```javascript
function navigateTo(route) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      updateContent(route);
      window.scrollTo({ top: 0 });
    });
  } else {
    // フォールバック: 即時差し替え + fade-in
    updateContent(route);
    window.scrollTo({ top: 0 });
    document.getElementById('app').animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 120, easing: 'ease' }
    );
  }
}
```

```css
/* View Transitions: ヒーローの名前付き遷移 */
.hero-band {
  view-transition-name: hero;
}

::view-transition-old(hero),
::view-transition-new(hero) {
  animation-duration: 200ms;
  animation-timing-function: ease;
}

/* prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(hero),
  ::view-transition-new(hero) {
    animation-duration: 0.01ms;
  }
}
```

---

## 7. フルブリード + センター寄せの共存

### 7-1. Josh Comeau 方式

現行の `.hero-band` はフルブリード、`.content-band` は `width: min(100%, var(--max))` でセンター寄せ。この2つの共存方法:

```css
/* 方法1: 現行パターン（各セクションが自己管理） — 推奨 */
.hero-band {
  /* フルブリード: padding で内部余白 */
  padding: ... clamp(16px, 4vw, 40px) ...;
}

.content-band {
  /* センター寄せ */
  width: min(100%, var(--max));
  margin-inline: auto;
  padding: ... clamp(16px, 4vw, 0px);
}
```

```css
/* 方法2: CSS Grid full-bleed（Josh Comeau 方式） */
/* #app 全体に Grid を設定し、子要素のカラム配置で制御 */
#app {
  display: grid;
  grid-template-columns:
    1fr
    min(var(--max), 100% - clamp(32px, 8vw, 80px))
    1fr;
}

#app > * {
  grid-column: 2; /* デフォルトはセンター */
}

.hero-band,
.full-bleed {
  grid-column: 1 / -1; /* フルブリード */
}
```

**k-ba-man での推奨:** 方法1（現行パターン）を継続。理由:
- SPA で `#app` の内容が頻繁に差し替わるため、Grid の設定が複雑になる
- 各セクションの自己完結性が高い方が JS からの DOM 操作が容易

---

## 8. 実装優先度

| 優先度 | 項目 | 対応ファイル |
|---|---|---|
| **P0** | ゲートストライプの CSS 変数化 | styles.css |
| **P0** | ヒーロー CTA の3段階階層化 | styles.css, app.js |
| **P0** | 予想ライブバナーの条件付き表示 | app.js, styles.css |
| **P1** | グラデーションオーバーレイの oklch 移行 | styles.css |
| **P1** | サブページヒーローのバリエーション統一 | styles.css |
| **P1** | 「今週のドラマ」帯の実装 | app.js, styles.css |
| **P2** | 動的ヒーロー（首位キャラ / フェーズ反映） | app.js, styles.css |
| **P2** | View Transitions API 導入 | app.js, styles.css |
| **P3** | モバイル CTA の縦積みレイアウト最適化 | styles.css |

---

## 参考リソース

- [Josh W. Comeau — Full-Bleed Layout Using CSS Grid](https://www.joshwcomeau.com/css/full-bleed/)
- [Ryan Mulligan — Layout Breakouts with CSS Grid](https://ryanmulligan.dev/blog/layout-breakouts/)
- [Ahmad Shadeed — Handling Text Over Images in CSS](https://ishadeed.com/article/handling-text-over-image-css/)
- [web.dev — View transitions for SPAs](https://web.dev/learn/css/view-transitions-spas)
- [Codrops — Building Async Page Transitions in Vanilla JavaScript](https://tympanus.net/codrops/2026/02/26/building-async-page-transitions-in-vanilla-javascript/)
- [LogRocket — Hero Section Best Practices](https://blog.logrocket.com/ux-design/hero-section-examples-best-practices/)
- [CSS-Tricks — Stripes in CSS](https://css-tricks.com/stripes-css/)
- [Instant Gradient — Making Gradient Backgrounds Accessible](https://instantgradient.com/blog/accessible_gradient_guide)
