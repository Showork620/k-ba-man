# k-ba-man サイト デザイン最終仕様書 — Claude Code 統合版

**ファイル種別**: 実装可能な単一正本（implementation-ready single source of truth）
**親ドキュメント**: `design-spec.md`（v2・要件正本）／ `design-spec-re-plan.md`（差分台帳）／ `research-*.md`×14（技術調査）
**版**: v2.1（5観点監査 `design-spec-final-cc-audit.md` の critical 8・major 16 を反映後、全色値・コントラスト比・色相差を `python3` Oklab 実装で再検算し、v2 が検算せず載せた残存数値誤り4件を是正 → 末尾「v2.1 是正ログ」）
**最終更新**: 2026-06-27

---

## 0. 本書の位置づけ

本書は、要件正本 `design-spec.md`（v2）が定めた「何を・なぜ」に対し、14本の research 調査と差分台帳 re-plan が出した「具体的にどの値・どのコードで」を統合し、**開発者がこれ1本で実装に着手できる確定仕様**としてまとめたものである。

- **`design-spec.md` は引き続き要件の正本**。情報設計・トーン・成功基準の変更が必要な場合は `design-spec.md` を更新する。本書はその実装版であり、要件と矛盾しない。
- 各値は**移行先（target）**である。本サイトは稼働中の `site/`（vanilla HTML/CSS/JS・ハッシュルーティング・フレームワーク不使用）であり、現行実装からの差分（migration）として扱う。重要箇所には「現行 → 最終」マッピングを併記した。
- 14本の調査エージェントが独立に抽出した結果には**一部不整合**があった。本書はそれらを Claude Code として裁定し、確定値を1つに定めている。裁定の内容と根拠は **§1 統合判断サマリー** と **付録A** に集約した。

### 横断する3つの絶対ルール（全領域で例外なく適用）

1. **`color-mix()` は必ず `in oklch`**。現行 `site/styles.css` に残る `color-mix(in srgb, …)` は実 **21箇所**（495,496,534,618,629,668,834,927,1003,1052,1058,2109,2116,2179,2181,2222,2288-2298,2360 行）すべてを `in oklch` に置換する。sRGB 混合は新規・既存問わず禁止。
2. **`prefers-reduced-motion: reduce` では duration を `0.01ms`**（`0ms` ではない。`0ms` は `transitionend`/`animationend` が発火しない実装があるため）。
3. **キャラクター色はインライン `style="--accent:…"` で注入**し、CSS は `var(--accent)` のみを読む（個別 hue をハードコードしない）。この注入契約は現行のまま維持する。

> **色値の検算ルール（運用）**: 本書に載せる oklch / hex / コントラスト比の数値は、断定する前に必ず変換器（`python3` の Oklab 実装等）で検算する。上流（re-plan・research）の変換値を鵜呑みにしない。本書 v1 は surface の oklch（R1）と `--muted`（R5）で上流の誤変換を検算せず継承し、監査で是正した経緯がある。`docs/visual-design/design-spec-final-cc-audit.md` を参照。

---

## 1. 統合判断サマリー（reconciliation）

エージェント間で値が割れた項目の最終確定。詳細根拠は付録A。

| # | 項目 | 割れた候補 | **最終確定** | 根拠 |
|---|---|---|---|---|
| R1 | surface 明度 | color=0.11起点 / motion・mobile・css-arch=0.08起点 / a11y=0.13起点 | **実測 oklch 0.156 / 0.187 / 0.220 / 0.255**（hue 271–277・C 0.011–0.023） | 現行 `#0b0c11/#111319/#181a24/#20222e` を実 Oklab 変換した真の忠実移行値。当初の「0.11起点・忠実移行」は re-plan の誤変換（`#0b0c11≒oklch0.11`）を検算せず継承したもので、実値 L0.156 より約0.04暗く誤り（監査で是正）。0.08 は実値からさらに遠いので不採用は維持 |
| R2 | キャラ色 注入変数名 | live=`--accent` / spec・research=`--char-color` | **`--accent`** を維持（派生は `--accent-vivid/-mid/-dim`） | app.js が全要素で既に `--accent` を注入済み。改名は稼働JSを壊すため最小チャーンを優先 |
| R3 | dim/mid/vivid の混合相手 | `black` / `transparent` / `--surface-0`(=`--bg`) | **`--surface-0`**（不透明ティント）。半透明グロー用途のみ `transparent` 版を別途許可 | 「微かに色味を帯びた暗色」へ向けた減光が design-spec の意図 |
| R4 | `--max` | 1180px（現行・performance据置案） / 1200px | **1200px** | design-spec §4-4 + re-plan §5 の正本値 |
| R5 | `--muted` | #62647a（現行・実3.37:1・AA未達） / oklch(0.55…) | **oklch(0.62 0.04 270) ≈ #7d859f** | surface-0/1/2 で 4.7〜5.4:1 と AA達成（実計算）。当初の「oklch(0.55)≈#7a7c92・4.6:1」は色変換も比も誤り（実 oklch(0.55)=#68718a・S0 4.0:1、L0.55 は surface-1/2 で AA未達）。S3(modal) 上では --text を使う |
| R6 | 余白トークン命名 | px系(--space-lg/md/sm) / rem系(--page-px/--space-section/--space-block) | **rem系**（px系は別名コメント） | re-plan §5 が後発の確定。rem はズーム追従でa11y有利 |
| R7 | 底部タブバー高さ | 56px / 60px | **60px**（タップ実体60px + safe-area） | design-spec 56-64px の範囲内、tab-item 高さと一致 |
| R8 | ボトムシート高さ単位 | vh / dvh | **dvh**（mobile 92dvh / desktop 85dvh） | モバイルURLバー収縮でvhははみ出す |
| R9 | 10キャラ パレット | 現行hex / 新oklch（色相渋滞修正） | **新oklch（sRGBガマット補正済）を P1 推奨**（現行hexは移行対照・要オーナー承認） | re-plan が「色相渋滞」を要改定と明記。当初案は10色中5色が sRGB ガマット外（ブラウザがクリップし指定色とズレる）だったため C を上限内へ補正。成功基準#11に直結 |
| R10 | フォント fallback metrics | typography研究=88/22/100 / re-plan=105/25/102 | **typography研究値 88/22/100 を初期値**・CJK実測で再確定 | research 由来値を採用。当初「typography=105/25/102」は出典取り違え（105/25/102 は re-plan 由来）。実フォント計測（Fontaine/capsize）で最終確定 |

> **オーナー承認が要る決定は R9（10色パレット刷新）のみ**。これはサイト全体の視覚的アイデンティティを変えるため、本書では推奨として提示し、現行hexでも動作することを明記する。他は実装に直結する確定値として扱ってよい。

---

## 2. デザイントークン正本

すべて単一 `site/styles.css` の `:root`（`color-scheme: dark`）に定義する。これが全ページ・全コンポーネントの色・寸法・モーションの唯一の供給元。

### 2-1. トークンの層と命名規約

- **2層モデル**（3層厳密分離は不採用＝オーバーエンジニアリング）:
  - **Semantic 層**: `:root` 直下に直接定義（surface / text / status / spacing / motion …）。ダーク専用のため `prefers-color-scheme` 切替は不要。
  - **キャラクター動的注入層**: `style="--accent:…"` で要素ごとに注入し、`[style*="--accent"]` セレクタで `--accent-vivid/-mid/-dim` を1箇所で派生。
- **命名規約**:
  - 状態クラス = `is-` プレフィックス（`.is-active` `.is-current` `.is-selected`）
  - JS フック = `data-*` 属性（`data-char-id` `data-phase` `data-rank` `data-status`）。クラスに依存しない
  - コンポーネント = BEMライト（`.card__title` は可、深いネストは避ける）。子要素はコンポーネント名プレフィックス（`.rank-person` `.rank-metric`）
  - `--c-<id>` = キャラ色の**静的パレット定義**（パレット正本）／ `--accent` = **インスタンス注入**（実体）

### 2-2. サーフェス & ボーダー（R1）

ダークテーマの深度は **明度差が主・影が従**。上の階層ほど明るい（MD3 tonal elevation）。4段階を超えない。下記は現行 hex を **標準 Oklab 変換で実計算した値**（`#000=0/#fff=1/#808080=0.6` で検証済み）であり、現行の見た目を厳密に保つ真の忠実移行値である。

| トークン | 最終値（oklch・実測） | 現行hex | 用途 |
|---|---|---|---|
| `--surface-0` | `oklch(0.156 0.011 276)` | `#0b0c11` | ページ全体背景（最奥）。color-mix 減光の既定相手 |
| `--surface-1` | `oklch(0.187 0.013 271)` | `#111319` | ナビ・セクション・カード背景。**旧・無番号 `--surface` の置換先** |
| `--surface-2` | `oklch(0.220 0.020 276)` | `#181a24` | 入力・内部ブロック・ホバー・カード上カード |
| `--surface-3` | `oklch(0.255 0.023 277)` | `#20222e` | モーダル・ポップオーバー・最前面 |
| `--border` | `oklch(0.240 0.027 278)` | `#1c1e2c` | 標準境界線 |
| `--border-mid` | `oklch(0.279 0.031 279)` | `#252738` | やや明るい境界（ホバー時） |

> **移行注記**: 現行の無番号 `--surface`（`#111319`）参照はすべて `--surface-1` に置換。`--bg` は `--surface-0` のエイリアスとして残してよいが、新規コードは番号付きを使う。
> **暗くしたくない場合は hex のまま使ってもよい**（color-mix は hex を `in oklch` 空間で正しく混合する）。oklch 化の目的はトークン系の一貫性であり、上記は現行 hex と知覚的に同一。

ページ別の色温度変更（design-spec §4-2 が許可）は **oklch() の var() チャネル差し込みが不可**なため、各ページに完全なリテラル oklch() を書くか JS 注入する。**`--bg` ではなく `--surface-0` 自体を上書きする**こと（`--accent-dim/-mid` の混合相手が `--surface-0` なので、こうしないと色温度がキャラ色ティントに波及しない）:

```css
.page-results  { --surface-0: oklch(0.156 0.011 276); } /* 冷色（監査室） */
.page-live     { --surface-0: oklch(0.156 0.011 40);  } /* 暖色（競馬場） */
.page-overview { --surface-0: oklch(0.156 0.008 250); } /* ニュートラル */
body { background: var(--surface-0); }
```

### 2-3. キャラクターカラー（R2・R3・R9）

#### 注入契約（変更なし・維持）

```html
<a class="character-card" style="--accent:oklch(0.46 0.16 28)">…</a>
```

```css
/* 任意の --accent から3段階を1箇所で派生（color-mix は in oklch） */
[style*="--accent"] {
  --accent-vivid: var(--accent);                                       /* 100% : バッジ・アイコン塗り・フォーカスリング */
  --accent-mid:   color-mix(in oklch, var(--accent) 25%, var(--surface-0)); /* 25% : ボーダー・ホバー背景 */
  --accent-dim:   color-mix(in oklch, var(--accent) 10%, var(--surface-0)); /* 10% : カード背景ティント */
  /* 半透明グロー／オーバーレイ用途のみ: */
  --accent-glow:  color-mix(in oklch, var(--accent) 30%, transparent);
}
```

> **ティントの混合相手**: `--accent-dim/-mid/-vivid`（ページ直下に乗る派生）は `--surface-0` と混ぜるためページ別色温度（§2-2）に追従する。一方、カード画像背景（§4-1）やドラマブロック（§11）など **`--surface-1` のコンテナ上に乗るワンオフ・ティント**は、コンテナと馴染ませるため混合相手をそのコンテナ色 `--surface-1` にする（＝色温度追従の対象外で、§2-2 の「`--surface-0` を上書きせよ」の例外）。

#### FINAL 10色パレット（R9・P1 推奨・要オーナー承認）

現行は **緑系2色（健太145°/優子160°）・暖色系3色（鉄平40°/陽菜25°/吾郎35°）・赤系2色（龍之介0°/さくら345°）** が密集し、小サイズで判別困難（re-plan が要改定と明記）。最終パレットは色相環で分離を最大化し、**残る隣接近接ペア（後述・実5ペア）は明度(L)・彩度(C)で差別化**する（色相だけに頼らない）。全キャラ **L 0.45–0.60**。下記 oklch は **全色 sRGB ガマット内**に収めた確定値（当初案は10色中5色がガマット外で、ブラウザのクリップにより指定色から色相・彩度がズレていた → C を各 L/H での上限内へ補正。`python3` で全色のガマット内判定を再検算済み）。`hex` 列は各 oklch のレンダリング結果（移行後の実色）。

| 席 | id | 流派 | **最終 oklch** | 現行hex→新hex | 変更要点 |
|---|---|---|---|---|---|
| 01 | tatsunosuke | 龍之介・血統 | `oklch(0.46 0.16 28)` | `#7f1d1d`→`#9e231e` | 深紅。さくらと L↓・C↓・H で分離 |
| 02 | makoto | 誠・データ統計 | `oklch(0.55 0.088 200)` | `#0f766e`→`#188186` | ティール、H200。C 0.10→0.088（ガマット補正） |
| 03 | misaki | 美咲・展開 | `oklch(0.50 0.18 300)` | `#6d28d9`→`#7541b8` | バイオレット、H 260→300 |
| 04 | kenta | 健太・指数 | `oklch(0.55 0.15 138)` | `#15803d`→`#3f8521` | 黄緑、H145→138 優子と分離 |
| 05 | teppei | 鉄平・調教 | `oklch(0.52 0.102 85)` | `#a16207`→`#84630e` | アンバー、H85。C 0.13→0.102（ガマット補正） |
| 06 | sakura | さくら・市場 | `oklch(0.55 0.20 8)` | `#be123c`→`#c9235b` | クリムゾン、最高彩度 |
| 07 | aoi | 葵・騎手 | `oklch(0.50 0.138 250)` | `#1d4ed8`→`#0865ae` | ブルー、H 230→250。C 0.17→0.138（ガマット補正） |
| 08 | hina | 陽菜・穴党 | `oklch(0.60 0.15 52)` | `#ea580c`→`#c3610d` | オレンジ、最明 L0.60。C 0.17→0.15（ガマット補正） |
| 09 | yuko | 優子・本命 | `oklch(0.47 0.085 172)` | `#047857`→`#136a55` | エメラルド。C0.092→0.085（ガマット補正・上限0.091）。L0.47 で makoto と分離 |
| 10 | goro | 吾郎・馬場 | `oklch(0.45 0.085 112)` | `#854d0e`→`#575a1a` | オリーブ/カーキ、最暗 L0.45 で teppei と分離 |

```css
/* パレット静的定義（ゲートストライプ・席番号バッジ・ランキングの単一供給源）。全色 sRGB ガマット内 */
:root {
  --c-tatsunosuke: oklch(0.46 0.16  28);
  --c-makoto:      oklch(0.55 0.088 200);
  --c-misaki:      oklch(0.50 0.18  300);
  --c-kenta:       oklch(0.55 0.15  138);
  --c-teppei:      oklch(0.52 0.102 85);
  --c-sakura:      oklch(0.55 0.20  8);
  --c-aoi:         oklch(0.50 0.138 250);
  --c-hina:        oklch(0.60 0.15  52);
  --c-yuko:        oklch(0.47 0.085 172);
  --c-goro:        oklch(0.45 0.085 112);
}
```

**色相差 sub-30° は実5ペア**（当初「4ペア・≥30°」は誤り。色相環を `python3` で実計算検証。監査が示した「6ペア」は goro=110° 前提で算出されたもので、本書が確定した goro=112° では sub-30° は5ペア）。各ペアは L/C で分離する:

| 隣接ペア（色相環順） | 色相差 | L 差 / C 差 | 分離手段 |
|---|---|---|---|
| sakura(8)↔tatsunosuke(28) | 20° | dL 0.09 / dC 0.040 | L+C |
| tatsunosuke(28)↔hina(52) | 24° | dL 0.14 / dC 0.010 | L |
| teppei(85)↔goro(112) | 27° | dL 0.07 / dC 0.017 | L |
| goro(112)↔kenta(138) | 26° | dL 0.10 / dC 0.065 | L+C |
| yuko(172)↔makoto(200) | 28° | dL 0.08 / dC 0.003 | L |

> 残る hina↔teppei(33°)・kenta↔yuko(34°)・makoto↔aoi(50°)・aoi↔misaki(50°)・misaki↔sakura(68°) は ≥30° で色相のみで分離。

> app.js のキャラオブジェクト `color:` フィールドをこの oklch 文字列に置換し、従来どおり `--accent` として注入する（JS 構造変更なし）。**採用は P1**（現行hexでも全機能は動作する）。採用時はゲートストライプ・席番号バッジの色も一斉に追従する。

### 2-4. セマンティック / ステータスカラー

成績判定・順位変動の色は全ページ統一。キャラ色との非干渉は **形状を主・色を従**として担保する（当初の「明度帯で ~0.15 差を確保」は確定値で破綻 — status-out L0.55 と sakura L0.55 が同明度の赤 — ため撤回）。

- **形状分離（主）**: ステータス = pill（`border-radius:999px`）または上下矢印／所属・席 = 円形バッジ（`border-radius:50%`）。色が近くても形と文脈で判別。
- **明度傾向（従）**: status 色は概ねキャラ色より明るめ（L 0.54–0.74。--red 0.54 / --green 0.55 / --gold 0.74）だが、これは保証ではなく傾向。色だけで区別させない（§8 の「色を唯一の信号にしない」を併用）。

**semantic / status トークンは下記が正本**。pill・form-dot・rank-number・arrow など成績色を使う全コンポーネントは **`var(--status-*)` を参照**し、リテラル hex を散らさない（同一概念が複数値にならないように）。win/place/out/up/down と danger は brand 色（`--gold`系・`--red`・`--green` 等）を土台にする。

| 用途 | semantic トークン | 値（= brand 継承トークン or oklch） |
|---|---|---|
| 的中 win | `--status-win` | `var(--gold)`（pill 文字 `--status-win-text`=`var(--gold-light)`） |
| 3着内 place | `--status-place` | `#6366f1`（pill 文字 `--status-place-text`=`#a5b4fc`） |
| 外れ・圏外 out | `--status-out` | `var(--red)`（pill 文字 `--status-out-text`=`#f87171`） |
| 順位上昇 up | `--status-up` | `var(--green)`（`#26845a`） |
| 順位下降 down | `--status-down` | `#f97316` |
| 降格圏グロー | `--danger-glow` | `oklch(0.55 0.18 25)`（新規） |
| 降格圏 弱 | `--danger-dim` | `oklch(0.55 0.08 25)`（新規） |

**継承ブランドトークン（§2 正本に明記）**: 現行 `site/styles.css :root` の以下を本書の正本トークンとして引き継ぐ（component CSS はこれらを `var()` 参照する。§2 の他トークンと同様に「唯一の供給源」に含める）。

```css
:root {
  --gold:       #c9a840;  --gold-light: #dfc060;
  --gold-dim:   color-mix(in oklch, var(--gold) 10%, transparent);  /* 旧 rgba(201,168,64,.10) を oklch 化 */
  --gold-glow:  color-mix(in oklch, var(--gold) 18%, transparent);  /* 旧 rgba(201,168,64,.18) */
  --green: #26845a;  --amber: #b87400;  --red: #be3636;
  /* status エイリアス（成績色の唯一の供給源） */
  --status-win: var(--gold);   --status-place: #6366f1; --status-out: var(--red);
  --status-up:  var(--green);  --status-down:  #f97316;
  /* ピル/数字の文字色（同概念=1トークン。component はこれを var() 参照しリテラルを散らさない） */
  --status-win-text: var(--gold-light); --status-place-text: #a5b4fc; --status-out-text: #f87171;
  --danger-glow: oklch(0.55 0.18 25); --danger-dim: oklch(0.55 0.08 25);
}
```

> ステータスピルは**現行 `.status-pill .win/.place/.out`（shipped）を再利用**し、別系統 `.result-pill` は作らない（ただし `border-radius` は現行 3px → **999px に変更**して pill 形状を満たす）。ラベルは **的中 / 3着内 / 圏外**。

### 2-5. テキストカラー（R5）

数値は標準 sRGB 相対輝度で実計算した値（コントラスト比）。

| トークン | 値 | 対 S0 / S1 / S2 | 用途 |
|---|---|---|---|
| `--ink` | `#edeae0` | 16.2 / 15.4 / 14.4 ✓ | 見出し・キャラ名（温かいオフホワイト） |
| `--text` | `#a8a59c` | 7.9 / 7.5 / 7.0 ✓ | 本文（冷たい環境光） |
| `--muted` | **`oklch(0.62 0.04 270)` ≈ `#7d859f`** | 5.4 / 5.1 / 4.7 ✓ | メタ・ラベル限定（旧 `#62647a` は実3.4:1でAA未達→修正） |
| `--faint` | `#3a3b4e` | — | 装飾ボーダー・微弱線（テキスト不可） |

> `--muted` は **surface-0/1/2 で AA（≥4.5:1）達成**（実計算）。surface-3（modal, 対比4.3:1）上のメタ表示には `--text` を使う。当初案 `oklch(0.55…)≈#7a7c92` は色変換も比も誤りだった（実 `oklch(0.55 0.04 270)`=`#68718a`・S0 4.0:1で未達）。読ませる本文は常に `--text` 以上。

### 2-6. タイポグラフィ

**3書体ロール**（`Source Serif 4` はラテン専用のため日本語見出しに不適＝re-plan散文の誤記とみなし不採用）:

```css
--f-serif: 'Shippori Mincho B1', 'Shippori Fallback', 'Noto Serif JP', 'Yu Mincho', serif;  /* 見出し・キャラ名・ドラマ本文 */
--f-sans:  'Noto Sans JP', 'Noto Sans JP Fallback', 'Hiragino Sans', 'Yu Gothic UI', system-ui, sans-serif;  /* 本文・UI */
--f-mono:  'JetBrains Mono', 'Menlo', 'Consolas', monospace;  /* 数値・指標（tabular-nums） */
```

**タイプスケール**（Perfect Fourth 1.333・base 16px。`--type-scale` を切り替えるだけで全段が連動）:

```css
:root {
  --type-base: 1rem;    /* 16px。15px以下はダークで辛い */
  --type-scale: 1.333;  /* Perfect Fourth */
  --type-xs:  calc(var(--type-base) * 0.75);   /* 12.0px : キャプション・計器ラベル */
  --type-sm:  var(--type-base);                /* 16.0px : 本文同等（小本文が要れば 0.9rem を別途追加） */
  --type-md:  calc(var(--type-base) * var(--type-scale));  /* 21.3px : サブ見出し */
  --type-lg:  calc(var(--type-md) * var(--type-scale));    /* 28.4px : セクション見出し */
  --type-xl:  calc(var(--type-lg) * var(--type-scale));    /* 37.9px : ページタイトル */
  --type-2xl: calc(var(--type-xl) * var(--type-scale));    /* 50.5px : ヒーロー見出し */
  --ls-body: 0.02em; --ls-heading: 0.04em; --ls-label: 0.06em; --ls-mono: 0;
}
@media (max-width: 620px) { :root { --type-scale: 1.25; } } /* モバイルは Major Third */
```

**P0 フォントレンダリング**（現行未指定・ダーク背景の漢字つぶれ対策）:

```css
body {
  font-family: var(--f-sans); font-size: var(--type-base);
  line-height: 1.7; letter-spacing: var(--ls-body);     /* 本文 1.65→1.7 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
h1, h2 { font-family: var(--f-serif); font-weight: 700; letter-spacing: var(--ls-heading); line-height: 1.3; }
h3, h4 { font-family: var(--f-serif); font-weight: 400; letter-spacing: var(--ls-label); line-height: 1.4; }
/* Shippori Mincho B1 は 300 が無いため 400/700 のみ使用 */
```

**P0 数値の tabular-nums 統一**（混在テキストはラベルと数値を別 span に分離。`font-variant-numeric` は JP 文字に無効なため）:

```css
.stat-value, .ranking-metric, .score, .metric-value {
  font-family: var(--f-mono); font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1; letter-spacing: var(--ls-mono);
}
```

**P2 CLS対策フォールバックメトリクス**（R10・初期値・CJK実測で再確定）。値は **research-typography.md / research-performance.md が一致して提案する 88/22/100** を採用（当初の 105/25/102 は re-plan 由来で出典取り違えだったため修正）:

```css
@font-face { font-family:'Noto Sans JP Fallback'; src:local('Hiragino Sans'),local('Meiryo');
  ascent-override:88%; descent-override:22%; line-gap-override:0%; size-adjust:100%; }
@font-face { font-family:'Shippori Fallback'; src:local('Yu Mincho'),local('YuMincho');
  size-adjust:97%; ascent-override:90%; descent-override:20%; line-gap-override:0%; }
/* いずれもラテン比率の推定値。Noto/Shippori の実 CJK メトリクスを Fontaine/capsize で計測して最終確定 */
```

`<head>` に `<link rel="preconnect" href="https://fonts.googleapis.com">` と `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` を追加（現行 `@import` 維持・`display=swap`）。

### 2-7. スペーシング & レイアウト（R4・R6）

```css
:root {
  --max: 1200px;                                       /* 現行 1180px から変更 */
  --page-px:       clamp(1rem, 0.7rem + 1.5vw, 2.5rem);   /* 16→40px ページ左右（旧 --space-page） */
  --space-section: clamp(3rem, 2.4rem + 3vw, 6rem);       /* 48→96px セクション間（旧 --space-lg） */
  --space-block:   clamp(1.5rem, 1.3rem + 1vw, 2.5rem);   /* 24→40px ブロック間（旧 --space-md） */
  --space-gutter:  8px;                                   /* カードグリッド gap（8–12px は固定で十分） */
  --card-px:       clamp(0.875rem, 0.75rem + 0.5vw, 1.25rem); /* 14→20px カード内 */
  --radius: 3px; --radius-md: 6px;
  --header-h: 68px;                 /* ヘッダー高さ。ヒーロー高さ計算 calc(100dvh - var(--header-h)) で参照（§5-1） */
  --bp-sm: 620px; --bp-md: 880px;   /* 参照用。@media には var() 不可 → リテラル記述 */
}
```

> **ブレイクポイントは @media に var() を使えない**（@media は計算前評価）。`--bp-sm/--bp-md` はドキュメント用トークン、実 @media は `max-width:620px` / `min-width:621px` / `min-width:881px` をリテラルで書く。

### 2-8. モーション

```css
:root { --duration-fast: 150ms; --duration-medium: 300ms; --ease-default: ease; }
@media (prefers-reduced-motion: reduce) {
  :root { --duration-fast: 0.01ms; --duration-medium: 0.01ms; }  /* R: 0ms 不可 */
  *, *::before, *::after {
    animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important; scroll-behavior: auto !important;
  }
  ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
}
```

- 基本トランジション = `--duration-fast`（ホバー・ボタン・タブ）／ 展開系 = `--duration-medium`（モーダル・アコーディオン。design-spec の 250–350ms を 300ms に確定）。
- アニメーション対象は **transform / opacity のみ**（compositor 安全）。width/height/top/left/margin はアニメ禁止。

### 2-9. シャドウ & フォーカス

```css
:root {
  --shadow-1: 0 1px 3px oklch(0 0 0 / 0.4);    /* カード既定 */
  --shadow-2: 0 4px 16px oklch(0 0 0 / 0.45);  /* 浮遊パネル */
  --shadow-3: 0 12px 48px oklch(0 0 0 / 0.55); /* モーダル */
  --accent-focus: oklch(0.75 0.13 330);        /* 標準フォーカスリング。hue330（全キャラ色相から≥30°離れた未使用帯） */
}
```

- `--shadow-1/2/3` は **矩形要素（カード/浮遊パネル/モーダル）専用**。カードは `box-shadow:var(--shadow-1)`（§4-1）、モーダル/ボトムシートは `var(--shadow-3)`（§4-7）で実参照する。浮遊パネルには `var(--shadow-2)` を付与する（深度の主役は明度差、影は従）。
- 透過PNG立ち絵には **必ず `filter: drop-shadow()`**（`box-shadow` は矩形の影が出る）→ §4・§7 参照。
- **`--accent-focus` の検証**: `oklch(0.75 0.13 330)`（≈`#dc8fd5`）は対 surface-0〜3 で **6.7〜8.3:1** と非テキストUI基準3:1を全面的に超える。hue330 は10キャラの色相（8〜300）すべてから ≥30° 離れており衝突しない（当初の hue250 は aoi=250 と完全同一色相だったため変更）。

### 2-10. 技術制約（設計ガードレール）

| 制約 | 内容 | 影響 |
|---|---|---|
| color-mix 色空間 | 全て `in oklch`。srgb 混合禁止 | 全領域 |
| oklch var() チャネル | `oklch(L C var(--h))` は不可。完全リテラルか JS 注入のみ | ページ別色温度・グラデ |
| `@starting-style` | Safari は 17.5+ で対応済み。ただし**動的にDOM挿入/表示される要素（`showModal()` 等）にルールが効かないバグ**がある | モーダル/シートは**開きアニメのみ**・閉じは即時非表示（理由は未対応ではなく動的挿入バグ回避） |
| View Transitions API | Baseline 2025（Chrome111+/FF133+/Safari18+）。非対応は即時切替（graceful degradation・エラー禁止） | ページ/フェーズ遷移 |
| color-mix / oklch | Baseline Widely Available（2023+）。RCS `oklch(from …)` は ~89.6%・補助用途のみ | 色生成 |

---

## 3. レイアウト & レスポンシブ

### 3-1. ブレイクポイントと最大幅

- モバイル ≤620px ／ タブレット 621–880px ／ デスクトップ ≥881px。
- フルブリードは **Josh Comeau 3カラム Grid**:

```css
.page-layout {
  display: grid;
  grid-template-columns: 1fr min(var(--max), 100% - var(--page-px) * 2) 1fr;
}
.page-layout > * { grid-column: 2; }
.full-bleed { grid-column: 1 / -1; width: 100%; }  /* ヒーロー・10色ストライプ帯 */
```

### 3-2. カラム数マトリクス

| グリッド | デスクトップ(≥881) | タブレット(621–880) | モバイル(≤620) | 実装 |
|---|---|---|---|---|
| キャラ一覧 | 5列 | 3列 | 1列（max-width:400px中央） | メディアクエリ固定 |
| 予想カード(Live) | 2列 | 2列 | 1列 | メディアクエリ固定 |
| 統計タイル | 4列 | 2列 | 2列（1列に落とさない） | メディアクエリ固定 |
| ランキング行 | 全指標 | 主要指標 | ソート中1指標 | flex + display:none |
| 可変カード（レース等） | auto-fit | auto-fit | auto-fit | `repeat(auto-fit, minmax(min(220px,100%),1fr))` |

### 3-3. 底部タブバー（R7）+ safe-area

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.bottom-tab-bar { display: none; }
@media (max-width: 620px) {
  .bottom-tab-bar {
    display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
    height: calc(60px + env(safe-area-inset-bottom, 0px));   /* タップ実体60px */
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--surface-1); border-top: 1px solid var(--border);
  }
  .tab-item { flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 2px; height: 60px; color: var(--muted);
    font-size: 10px; -webkit-tap-highlight-color: transparent; }
  .tab-item[aria-current="page"] { color: var(--accent-focus); }
  .tab-icon { width: 24px; height: 24px; }
  .page-content { padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px) + 1rem); }
}
@media (min-width: 621px) and (max-width: 880px) {  /* タブレット: ヘッダーナビ横スクロール */
  .header-nav { overflow-x: auto; white-space: nowrap; scrollbar-width: none; }
  .header-nav::-webkit-scrollbar { display: none; }
}
```

- タブ4項目固定: 概要(`#/overview`) / ライブ(`#/live`) / 成績(`#/results`) / キャラ(`#/characters`)。`aria-current="page"` を `hashchange` で更新。
- **【現行→最終・IA移行】**: 現行 app.js のルートは5本 `{overview, ranking, live, characters, races}`（ナビも5項目）。design-spec v2 §2-1 の統合方針に従い、**`#/ranking` と `#/races` を `#/results`（成績ページ内タブ）へ統合**してナビを5→4項目にする。これは app.js の router（route/param 分解）改修を伴い、R2「JS構造変更なし」が及ぶのは `--accent` 注入のみ＝ルーティングは別途改修対象。旧ルートは `#/results` へリダイレクトする。
- `viewport-fit=cover` が無いと `env(safe-area-inset-bottom)` が常に 0 を返す（必須）。

---

## 4. コンポーネント仕様

### 4-1. キャラクターカード & 立ち絵表示ルール

立ち絵表示は design-spec §4-2 の表に拘束される:

| コンテキスト | バリアント | サイズ | 切り抜き / object-position | 影 |
|---|---|---|---|---|
| キャラ一覧カード | `real.png` | min 150px / aspect 3:4（推奨2:3） | バスト中心 `center 25%`, `object-fit:cover` | drop-shadow |
| ランキング行・ミニ | `mini.png` | 44px 円形 | 顔中心 `center 15%`, `cover` | — |
| プロフィールヒーロー | `real.png` | min 300px 全身 | 足元まで `center bottom`, `object-fit:contain` | 2層 drop-shadow |
| 予想カード(Live) | `mini.png` | 48px 円形 | `center 15%`, `cover` | — |

- **`real.png` を 150px 未満で使わない**（小用途は必ず `mini.png`）。画像端とカード端の間に最低 8px の余白。
- **影は `filter: drop-shadow()` のみ**（`box-shadow` は透過PNGの矩形に影が付く）:

```css
.character-illustration       { filter: drop-shadow(0 8px 24px oklch(0 0 0 / 0.5)); }
.character-illustration--hero { filter: drop-shadow(0 4px 8px oklch(0 0 0 / 0.4))
                                        drop-shadow(0 16px 48px oklch(0 0 0 / 0.3)); }
```

```css
.character-card {
  display: flex; flex-direction: column; border-radius: var(--radius-md); overflow: hidden;
  background: var(--surface-1); border: 1px solid var(--border);
  border-bottom: 3px solid var(--accent-mid); box-shadow: var(--shadow-1);
  transition: transform var(--duration-fast) ease, border-color var(--duration-fast) ease;
  will-change: transform; /* 常時表示・最大10枚なので静的付与可 */
}
.character-card__image-wrap { aspect-ratio: 3/4; overflow: hidden;
  background: color-mix(in oklch, var(--accent) 8%, var(--surface-1)); }
.character-card__image-wrap img { width: 100%; height: 100%; object-fit: cover; object-position: center 25%; }
@media (hover: hover) { .character-card:hover { transform: translateY(-3px); border-color: var(--accent-vivid); } }
@media (hover: none)  { .character-card:active { transform: translateY(-1px); border-color: var(--accent-mid); } }
.character-card:focus-visible { outline: 2px solid var(--accent-focus); outline-offset: 2px; }
/* フォーカスリングは --accent-focus を使う（accent-vivid だと対 surface-1 で
   tatsunosuke 2.40 / goro 2.53 / misaki 2.84 / yuko 2.86 が 3:1 未達、aoi 3.09・teppei 3.34・
   sakura 3.43 も僅少＝§8 非テキストUI基準を割る。--accent-focus は全 surface で 6.7:1 超） */
```

### 4-2. 席番号バッジ / 印記号 / ランク数字

```css
/* 席番号 01-10: キャラ色背景・白文字・円形 */
.seat-badge { display:inline-flex; justify-content:center; align-items:center;
  width:var(--badge-size,28px); height:var(--badge-size,28px); border-radius:50%;
  background:var(--accent,var(--muted)); color:#fff; font-family:var(--f-mono);
  font-weight:700; font-size:calc(var(--badge-size,28px)*0.43); flex-shrink:0; }
.seat-badge--light-bg { color: var(--surface-0); } /* 白文字AA不足色に暗文字。実計算では hina のみ該当 */
/* 席バッジ白文字コントラスト実測（補正後パレット）: hina 4.2:1（未達→.seat-badge--light-bg で暗文字4.7:1）。
   他9色は白で 4.59〜7.74:1 と AA達成（kenta 4.59 / makoto 4.66 が最小・境界）。teppei は白で5.6:1と安全。 */

/* 印 ◎○▲△: 常に4種・色分けしない・JPフォント固定（ラテンフォールバック禁止＝幅ズレ防止） */
.mark { display:inline-block; width:1.2em; text-align:center; font-family:var(--f-sans); color:var(--ink); }

/* ランク数字: 等幅・大きめ・gold */
.rank-number { font-family:var(--f-mono); font-variant-numeric:tabular-nums; font-weight:700; color:var(--gold-light); }
.rank-number--first  { text-shadow: 0 0 12px var(--gold-glow); }
.rank-number--danger { color: var(--status-out-text); } /* 8-10位（圏外と同じ危険赤） */
```

印記号には a11y のため `aria-label` を付ける（`<span aria-label="本命">◎</span>` 他、対抗/単穴/連下）。実機JP読み上げで冗長なら外す判断は実機検証で。

### 4-3. ステータスピル / 独自路線マーカー

```css
.status-pill { display:inline-flex; align-items:center; gap:4px; padding:2px 10px;
  border-radius:999px; font-family:var(--f-mono); font-size:0.72rem; font-weight:700;
  letter-spacing:0.03em; white-space:nowrap; }
.status-pill.win   { background:color-mix(in oklch, var(--status-win) 18%, transparent); color:var(--status-win-text); border:1px solid color-mix(in oklch, var(--status-win) 30%, transparent); }
.status-pill.place { background:color-mix(in oklch, var(--status-place) 15%, transparent); color:var(--status-place-text); border:1px solid color-mix(in oklch, var(--status-place) 25%, transparent); }
.status-pill.out   { background:color-mix(in oklch, var(--status-out) 12%, transparent); color:var(--status-out-text); border:1px solid color-mix(in oklch, var(--status-out) 22%, transparent); }
/* ★現行 .status-pill の border-radius は 3px。pill 形状(§2-4 形状分離)のため 999px に変更すること */
```

**独自路線マーカー**（集合知と異なる◎を指名＝多様性の可視化。**赤や⚠は使わない・責める表示ではない**）:

```css
.divergent-marker { display:inline-flex; align-items:center; gap:3px; padding:2px 8px;
  border-radius:10px; background:oklch(0.5 0.08 270 / 0.15); color:oklch(0.75 0.08 270);
  font-size:0.7rem; font-weight:500; }
.prediction-card[data-divergent] { border-color: oklch(0.5 0.08 270 / 0.3); }
```

フォークSVG(12px・aria-hidden) + 「独自路線」ラベル。展開時に「集合知◎ → キャラ◎」のテキスト対比、結果フェーズで 的中/外れ を追加。

### 4-4. ランキングテーブル（div + ARIA）& 降格圏

`<table>` でなく div ベース（モバイル変形が容易）。ソート中の列のみ `aria-sort`、他列は属性自体を**削除**（`none` を付けない）:

```html
<div class="ranking-list" role="table" aria-label="ランキング">
  <div role="rowgroup"><div class="ranking-row" role="row">
    <div role="columnheader">順位</div><div role="columnheader">予想家</div>
    <div role="columnheader" aria-sort="descending" data-sort="score">暫定</div>
    <div role="columnheader" data-sort="brier">Brier</div><!-- 非ソート列は aria-sort なし -->
  </div></div>
  <div role="rowgroup">…</div>
</div>
```

```css
.ranking-row { display:flex; align-items:center; padding:var(--card-px); border-bottom:1px solid var(--border); }
@media (hover:hover) { .ranking-row:hover { background: var(--surface-2); } } /* 行は背景シフトのみ */
.rank-stat { flex:0 0 auto; width:80px; text-align:right; font-family:var(--f-mono); font-variant-numeric:tabular-nums; }
.rank-active-stat { display:none; margin-left:auto; }
@media (max-width:620px) { .rank-stat { display:none; } .rank-active-stat { display:flex; flex-direction:column; align-items:flex-end; } }
```

**降格圏（3段階・静的・点滅しない）** — `>=3レース AND 暫定席次 8-10位` のときのみ。3未満は `data-provisional` で「参考順位」表示（danger演出なし）。inset glow（赤）+ 背景ティント + 左ボーダーの3層:

```css
:root { --danger-glow: oklch(0.55 0.18 25); --danger-dim: oklch(0.55 0.08 25); }
.ranking-row[data-rank="10"] { background: color-mix(in oklch, var(--danger-glow) 12%, var(--surface-1));
  border-left: 3px solid var(--danger-glow); box-shadow: inset 0 0 24px color-mix(in oklch, var(--danger-glow) 80%, transparent); }
.ranking-row[data-rank="9"]  { background: color-mix(in oklch, var(--danger-dim) 8%, var(--surface-1));
  border-left: 3px solid var(--danger-dim); box-shadow: inset 0 0 18px color-mix(in oklch, var(--danger-glow) 50%, transparent); }
.ranking-row[data-rank="8"]  { background: color-mix(in oklch, var(--danger-dim) 4%, var(--surface-1));
  border-left: 3px solid color-mix(in oklch, var(--danger-dim) 50%, var(--surface-1)); box-shadow: inset 0 0 14px color-mix(in oklch, var(--danger-glow) 25%, transparent); }
.ranking-row[data-provisional] { background: var(--surface-1); border-left:none; box-shadow:none; }
.ranking-note { font-size:0.75rem; color:var(--muted); text-align:center; } /* 「※ 降格圏は物語上の緊張演出です」 */
```

降格圏行には `aria-label="降格圏"` と `<span class="sr-only">（降格圏）</span>`（色だけに依存しない）。

**ソート UI（ハイブリッド）**: デスクトップ=列ヘッダー `<button>` + `aria-sort`／モバイル=`<select>`。5指標: score(席次・既定降順) / brier(昇順=良) / honmei(◎実績・降順) / coverage(網羅率・降順) / logloss(昇順=良)。並び替えは **FLIP**（400ms `cubic-bezier(.25,.46,.45,.94)`、reduced-motion では DOM 並べ替えのみ）。`role=status aria-live=polite` で「〜順にソートしました」を通知（~1000ms後クリア）。

### 4-5. 直近3戦ドット

```css
.recent-form { display:inline-flex; align-items:center; gap:4px; }
.form-dot { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
.form-dot--win   { background: var(--status-win); }
.form-dot--place { background: var(--status-place); }
.form-dot--out   { background: var(--status-out); }
```
> 成績色は §2-4 の `--status-*` を参照（1概念=1トークン）。ドット・ピル・ランク数字・矢印で同じ token を使い、リテラル hex を散らさない。

各ドットに `title`（レース名+結果）。`.recent-form` に `aria-label` 要約 + `<span class="sr-only">` を必須（ドットは `aria-hidden`）。テキスト版「◎1着→◎圏外→◎3着内」も可。

### 4-6. CTA 3階層

| 階層 | クラス | スタイル | 行き先 |
|---|---|---|---|
| Primary | `.button.primary` | gold塗り `--gold` / 暗文字 `--surface-0` / min-height 48px / 700 | 予想ライブ |
| Secondary | `.button.secondary` | 透明 / border `--border-mid` / 文字 `--text` / 46px | 成績 |
| Tertiary | `.button.tertiary` | 下線テキスト / `--gold` / 44px / リフトなし | キャラクター |

モバイルは縦積み（Primary 最上）・tertiary は中央寄せテキストリンク。

### 4-7. モーダル / ボトムシート（R8）

ネイティブ `<dialog>` + `showModal()`（フォーカストラップ・Escape・背面 inert・`role=dialog` を標準提供）。620px 以下はボトムシート:

```css
.bottom-sheet { border:none; padding:0; max-width:640px; width:100%; background:var(--surface-2); box-shadow:var(--shadow-3); }
.bottom-sheet::backdrop { background: oklch(0 0 0 / 0.6); }
@media (min-width:621px) { .bottom-sheet { border-radius:12px; margin:auto; max-height:85dvh; overflow-y:auto; } }
@media (max-width:620px) {
  .bottom-sheet { margin:0; margin-top:auto; max-height:92dvh; max-width:100%;
    border-radius:16px 16px 0 0; overflow-y:auto; overscroll-behavior:contain; }
  .bottom-sheet[open] { animation: slide-up var(--duration-medium) ease-out; } /* 開きのみ */
  @keyframes slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
}
html:has(dialog[open].bottom-sheet) { overflow:hidden; scrollbar-gutter:stable; } /* 背面スクロール抑止・JS不要 */
```

- ドラッグハンドル(36×4px・`aria-hidden`)・閉じるボタン(44×44px・sticky・`aria-label="閉じる"`)。
- 開く前に `document.activeElement` を保存、`close` イベントで復帰。backdrop クリック（`e.target===modal`）で閉じる。
- **閉じアニメーションは実装しない**（`@starting-style` は Safari 17.5+ で対応済みだが、`showModal()` で動的表示される要素にはルールが効かないバグがあり退場演出が破綻する。開きの slide-up のみ実装）。
- **要実機検証**: Safari + VoiceOver でモーダル静的コンテンツが読まれるか（既知のWebKitバグ）。

### 4-8. SVGアイコンスプライト / ロゴ / ゲートストライプ

**インライン SVG スプライト**（`<body>` 冒頭・`display:none`）。10モチーフを `<symbol id="icon-*" viewBox="0 0 24 24">` で定義し `<use>` で参照:

| symbol id | キャラ | モチーフ | symbol id | キャラ | モチーフ |
|---|---|---|---|---|---|
| `icon-scroll` | 龍之介 | 巻物 | `icon-smartphone` | さくら | スマホ |
| `icon-tablet` | 誠 | タブレット | `icon-binoculars` | 葵 | 双眼鏡 |
| `icon-pointer` | 美咲 | 指し棒 | `icon-ticket` | 陽菜 | 馬券 |
| `icon-index-card` | 健太 | 指数カード | `icon-checklist` | 優子 | チェックボード |
| `icon-stopwatch` | 鉄平 | ストップウォッチ | `icon-anemometer` | 吾郎 | 風速計 |

- 描画仕様: `viewBox 0 0 24 24`・**塗りなし**(`fill="none"`)・`stroke="currentColor"`・`stroke-width:1.5`・`stroke-linecap/linejoin:round`。サイズ 16(インライン)/20(カード)/24(詳細)px。
- 装飾用は `aria-hidden="true"`、単独で流派を示す場合は `role="img" aria-label="<流派名>"`。
- **10本の実パスは未制作**（research にプレースホルダのみ）＝制作タスク。

**ロゴ「K」を SVG パス化**（フォント依存をやめ FOUT 文字化け防止。favicon・OGP と同一パス再利用）:

```html
<svg class="brand-mark" viewBox="0 0 36 36" width="36" height="36" aria-hidden="true">
  <circle cx="18" cy="18" r="18" fill="var(--gold)"/>
  <path d="M13 10v16M13 18l10-8M13 18l10 8" stroke="var(--surface-0)" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
```

最小 28px（620px以下で縮小・サブタイトル非表示）、タップ44px確保。

**ゲートストライプ**（10色ハードストップ・**ぼかさない**）— `--c-<id>` の単一供給源から生成。使用は**ヒーロー下端 `::after`(4px) を主とし、フッター上端 `::before`(3px) はオプションのブックエンド**（design-spec §4-8「1箇所」に対する意図的な対）:

```css
.gate-stripe, .hero-band::after { height:4px; background: linear-gradient(90deg,
  var(--c-tatsunosuke) 0% 10%, var(--c-makoto) 10% 20%, var(--c-misaki) 20% 30%,
  var(--c-kenta) 30% 40%, var(--c-teppei) 40% 50%, var(--c-sakura) 50% 60%,
  var(--c-aoi) 60% 70%, var(--c-hina) 70% 80%, var(--c-yuko) 80% 90%, var(--c-goro) 90% 100%); }
@media (max-width:400px) { .hero-band::after { height:5px; } } /* 隣接色の識別性確保 */
```

### 4-9. フェーズステッパー（3段階）+ セグメンテッドコントロール

```html
<ol class="phase-stepper" role="list" aria-label="予想ライブのフェーズ">
  <li class="phase-step is-completed"><a class="phase-step__link" href="#/live/announce">
    <span class="phase-step__indicator"><span class="phase-step__number">1</span></span>
    <span class="phase-step__label">告知</span><span class="sr-only">完了</span></a></li>
  <li class="phase-step is-current"><a class="phase-step__link" href="#/live/predictions" aria-current="step">
    <span class="phase-step__indicator"><span class="phase-step__number">2</span></span>
    <span class="phase-step__label">予想公開</span></a></li>
  <li class="phase-step is-pending"><a class="phase-step__link" href="#/live/result">
    <span class="phase-step__indicator"><span class="phase-step__number">3</span></span>
    <span class="phase-step__label">結果</span></a></li>
</ol>
```

- 状態: `is-completed`（gold塗り）/ `is-current`（透明+accent枠+box-shadow リング, `aria-current="step"`）/ `is-pending`（surface-2背景・muted文字）。
- コネクタは隣接セレクタ疑似要素 `.phase-step + .phase-step::before`。完了区間は線を `--gold` に。
- **620px 以下はステッパーを `display:none`** にし、セグメンテッドコントロール（`role="tablist"` のピル3つ・`<a>` でディープリンク維持・ロービング tabindex・矢印/Home/End）へ切替。スライダー位置は `data-active` 属性で `transform` 制御。
- フェーズ切替は `#phase-body` のみ View Transitions でクロスフェード（150ms `--duration-fast`）。

---

## 5. ページ別仕様

各ページの情報要素は `design-spec.md` §2-2・§5 が正本。本節は実装上の肝とモバイル戦略を補う。

> **ページ間導線の優先度**（design-spec §2-3 が正本）: 最高優先 = 全ページ→`#/live`（グローバルナビ・ライブ中は強調）/ `#/live`→キャラ詳細 / 成績→キャラ詳細 / 一覧→キャラ詳細。**キャラクター詳細が最多導線を集める「ハブ」**として機能する（前後ナビ・関連キャラ・成績リンク）。リンクの視覚強調はこの優先度に従う。

### 5-1. Overview
- フルブリードヒーロー（キャッチ + サブ + CTA 3階層）。高さ FULL `min-height: min(620px, calc(100dvh - var(--header-h)))`（モバイル 480px）。`--header-h` は §2-7 で定義。
- ヒーロー直下: **予想ライブバナー**（現行グローバル `window.KBAMAN_LiveRaceApi`（`loadDataset()` の結果が app.js 内部変数 `LIVE_EVENT`。監査 B16 の `window.KBAMAN_LIVE_RACE` は実コードに無く誤り、実体は `KBAMAN_LiveRaceApi`）に対象レースがある時のみ JS 注入。追加挿入で**レイアウトシフトを起こさない**。`.live-pulse` 2sパルス + reduced-motion 停止 + phase-pill + compact CTA）。
- **「今週のドラマ」帯/カード**（§11）→ サマリー4統計 → 上位3名ミニランク → キャラ一覧導線 → 最新レース結果ダイジェスト → About（折りたたみ）。
- **About 折りたたみの中身**（design-spec §2-1）: 予想パイプライン概要（10人予想→集約→配分→買い目）+ Brier スコアの解説 + 集合知の設計思想。テック層向けの説明として配置のみでなく内容を備える。
- 背景は10人集合ビジュアル（無ければアクセントグラデにフォールバック）。

### 5-2. 予想ライブ
- ページヒーロー（レース情報 + フェーズ表示）→ **集合知パネル（印◎○▲△ + 上位馬の確率分布。`collective.ranking` 上位5頭を確率バー付きで表示）** → 個別予想カード（印・根拠・自信度・独自路線マーカー）→ 結果フェーズ（着順・収支・答え合わせ・ランク変動・直近3戦ドット）。ステッパーは(§4-9)。
- 漸進的開示: 告知=最小／予想=高密度／結果=最高密度。
- モバイル: フェーズナビ=セグメント、個別予想カードは**デフォルト閉じ**（キャラ名+◎馬名+自信度のみ・タップ展開）。
- **空状態**（`LIVE_EVENT=null`）: `role="status"`「次のレースはまだ未定です」+ `#/results` への CTA。
- **静的SPA誠実ルール**（§6参照）厳守。

### 5-3. 成績
- ページヒーロー → タブ切替（ランキング / レース別、`role=tablist` + ロービング tabindex）。
- ランキングタブ: ソート5指標 + 降格圏3段階(§4-4) + **スコア解説（5指標すべての1行定義を本文に置く・成功基準#4要件）**。レース別タブ: 累計統計 + レースカード×N + レース詳細モーダル(§4-7)。
- **指標の意味（解説パネル必須・design-spec §3-3 が計算式の正本）**:
  - **暫定スコア**: `max(0, (1 - meanBrier/2)*80) + honmeiWinRate*12 + max(0, honmeiHitRate - honmeiWinRate)*6 + (coverage/3)*2`（大きいほど上位。app.js `provisionalScore()` と一致）
  - **暫定席次**: 暫定スコア降順。同点は 平均Brier昇順 → ◎3着内率降順 → 席番号昇順 でタイブレーク
  - **Brier**: 予測確率の二乗誤差。**低いほど良い** / **LogLoss**: 対数損失。**低いほど良い**
  - **◎3着内率（本命実績）**: ◎指名馬が3着内に入った割合（高いほど良い） / **網羅率**: 印に入れた馬の的中カバー度（高いほど良い）
- モバイル: 順位+キャラ+ソート中1指標、ソートは `<select>`、ラベル短縮（「暫定席次」→「席次」）。
- **【現行→最終】**: 現行 `#/ranking`（ランキング）と `#/races`（成績履歴）の2ルートを本ページの2タブへ統合（§3-3 参照）。

### 5-4. キャラクター一覧
- カードグリッド 5/3/1。色(accent) + アイコン(SVGモチーフ) + テキスト(流派/二つ名) の3層で識別（色だけに依存しない）。

### 5-5. キャラクター詳細
- プロフィールヒーロー: 2カラム（立ち絵 / 情報）、`min-height:70dvh`（R8 に従い vh→dvh）、`align-items:end`、立ち絵 `object-fit:contain; object-position:center bottom` + 2層 drop-shadow、背景はアクセント放射+線形グラデ（`::before`）。
- 「この席に残る理由」ドラマブロック(§11) → 紹介 → 強み/弱点 → 関連キャラ(§11) → 成績履歴アコーディオン。前後ナビは**席番号順**。
- モバイル: 立ち絵を先（`order:-1`）・高さ `min(50dvh, 360px)`・前後ナビを最下部にも複製。

### 5-6. レース詳細モーダル
- 印・買い目・払戻・**勝ち筋ナラティブ**（§11）。620px 以下はボトムシート(§4-7)。

---

## 6. モーション & インタラクション

- **カード stagger**: `--stagger-index` 方式。固定10枚は `nth-child(1..10)` で 0..9、動的は JS `setProperty`。`animation-delay: calc(var(--stagger-index,0) * 30ms)`、入場 `card-enter 200ms ease-out`（`translateY(8px→0)` + opacity）、合計 ≤0.3s。
- **ページ遷移 = View Transitions**: `document.startViewTransition(() => { renderPage(); scrollTo(0,0); })`。ページ全体のクロスフェードは **`<main>` に名前を付けず root の遷移に委ねる**（`::view-transition-old(root)`=fade-out 100ms / `new`=fade-in 150ms）。`<main>` に `view-transition-name` を付けると root グループから切り出され root の fade が効かなくなるため、名前付き遷移はモーフさせたい要素（下記）だけに限定する。非対応は即時切替。
- **ヒーロー/カード→詳細のモーフ**: `.hero-band` に `view-transition-name: hero-main`、キャラ画像に `char-<id>`（同名要素が同時に2つ存在しないよう付与タイミング管理。`<id>` は CSS ident 妥当な英字 id を使う）。
- **ホバー/フォーカス/タッチ**: `@media (hover:hover)` でリフト `translateY(-3px)` + accent ボーダー、`@media (hover:none)` は `:active` で `-1px`、`:focus-visible` で accent アウトライン。ランキング行は背景シフトのみ。`will-change:transform` はホバーカードのみ（一括付与禁止）。
- **静的SPAの誠実ルール**（重要・全フェーズUI）:
  - **禁止**: リアルタイムカウントダウン、「更新中…」等の自動更新示唆、通知バッジ数字。
  - **許可**: 静的な「現在: 集計中」、`<time>` 最終更新日時、手動リロードボタン、曖昧な次フェーズ予告（「当日朝」「レース後」）。
  - パルスドット（`.phase-badge--live`）は予想公開中のみ・控えめ（現在フェーズ強調用途であってリアルタイム偽装ではない）。

---

## 7. 世界観表現（円卓 × 競馬場の二重空間）

- **和紙テクスチャ**（`feTurbulence`・**ヒーロー限定**＝大面積は高コスト）: インライン SVG `<filter id="paper-noise">`（`baseFrequency=0.65 numOctaves=4`, `saturate 0`）を `::before { filter:url(#paper-noise); opacity:0.03; mix-blend-mode:overlay; }` で重ねる。
- **金属ヘアライン**: `linear-gradient(to right, transparent, color-mix(in oklch, var(--ink) 12%, transparent) 20% 80%, transparent)`。データ領域（ランキング・統計）の区切りに。Retina で `border-width:0.5px`。
- **夜の競馬場の照明**: ヒーロー `::before` に暖色スポット（左下・`var(--gold)` 6%）× 冷色環境光（右上・`oklch(0.6 0.05 240)` 4%）の2放射グラデ。
- **ページ別背景**（P3・アセット依存・無ければアクセントグラデ）: Overview=集合 / 詳細=円卓の間 / 成績=監査室 / 予想=トラック朝焼け。`filter: blur(8px) brightness(0.3)` でコンテンツを前面に。
- **clip-path 斜め切り**は1-2箇所のアクセントのみ（カードグリッド全体には適用しない）。

---

## 8. アクセシビリティ

- **スキップリンク**: `<a class="skip-link" href="#app">` → `<main id="app" tabindex="-1">`。`position:absolute; top:-100%` で隠し `:focus` で `top:8px`（`display:none` 不可）。
- **SPA ルート変更時のフォーカス管理**: 遷移ごとに `main#app.focus()` + 常設 `<div id="route-announcer" class="sr-only" aria-live="polite" aria-atomic="true">` に `document.title` を投入 + `scrollTo(0,0)` + `aria-current` 同期（非アクティブは属性**削除**、`false` にしない）。
- **`aria-sort`**: ソート中の列のみ `ascending|descending`。他列は属性自体を削除（`none` 禁止）。`role=status` で結果通知。
- **立ち絵 alt の3規則**: (1)名前が隣接 → `alt=""`（装飾）／(2)単独識別子 → `alt="[名前] — [外見描写]"`（例: 「龍之介 — 巻物を持つ和装の青年」）／(3)ランキングサムネ → `alt=""`。プロフィールヒーロー = `alt="[名前]の全身立ち絵"`、集合 = `alt="k-ba-manの10人の予想屋キャラクター集合イラスト"`（OGP流用）。
- **色を唯一の信号にしない**: キャラ色 + 席番号 + 象徴アイコン + 流派名。降格圏は `sr-only`「（降格圏）」、印は `aria-label`。
- **コントラスト WCAG 2.1 AA**（通常4.5:1 / 大3:1 / 非テキストUI3:1）。APCA は補助チェック。フォーカスリング `--accent-focus`（**hue330**・全キャラ色相から≥30°離れた未使用帯・対全surface 6.7〜8.3:1）。カードの focus-visible も accent-vivid ではなくこの `--accent-focus` を使う（§4-1）。
- 全 `aria-live` 領域は初期ロードから DOM に存在させる（動的注入は一部SRが拾わない）。アイコンのみボタンは `aria-label`、内側 `<svg>` は `aria-hidden`。

---

## 9. パフォーマンス

> design-spec §4-7 は画像最適化を「最終調整フェーズ」に先送りするが、re-plan が mini.png 圧縮・script defer・width/height を **P0 に昇格**。本書は re-plan に従う。

- **画像（P0）**: 現行 mini.png 474–627KB/枚（10枚で約5MB・原寸640×960）。`cwebp -q 80 -resize 400 0`で **≤30KB/枚**へ。`<picture>` で WebP優先 + PNG フォールバック。real.png(1.07–1.78MB)はカードグリッド用に WebP ~200KB（`-resize 600 0`）。集合ビジュアルは2系統あり区別する: `assets/heroes/10-characters-hero.png`(約2.6MB・ヒーロー用) と `assets/characters/real-10-ensemble.png`(約4.0MB)。背景アート `ensemble-*.png`(2.5–3.05MB) も preload 前に WebP 化。`cwebp` はビルド機にインストール済み（`avifenc` は無し→AVIFはP3、追加時は `<source type=image/avif>` を先頭に）。
- **width/height 属性（P0）**: 全 `<img>` にネイティブ比の `width`/`height` を明示（CSS `aspect-ratio` と併用）。CLS=0。
- **script defer（P0）**: 5本の `<script>` 全てに `defer`（順序保持。`type=module` は使わない＝グローバル変数パターン維持）。
- **DocumentFragment（P0）**: 全リスト/グリッド描画は fragment に組んで1回 `appendChild`（リフロー1回）。
- **Critical CSS（P1）**: `<head>` に `:root` トークン部分集合 + リセット + ヘッダー + ヒーロー（≤3KB・値は styles.css とバイト一致）をインライン。本体は `<link rel="preload" as="style" onload="this.rel='stylesheet'">` + `<noscript>`。
- **LCP（P1）**: ヒーロー/プロフィールヒーローは `loading="eager" fetchpriority="high"`、ヒーロー背景(WebP)を `<link rel="preload" as="image">`。下方画像は `loading="lazy" decoding="async"`。**`lazy` と `fetchpriority=high` は同一 img に併用禁止**。
- **CWV ship gate**: LCP ≤2.5s / INP ≤200ms / CLS ≤0.1 / FCP ≤1.8s（Lighthouse + DevTools 検証）。
- スクロール/タッチは `{passive:true}`、read→write バッチで layout thrash 回避、リストは1つの委譲クリックリスナー。

---

## 10. OGP & ブランド

> ハッシュSPAではクローラが `#` 以降を読まない。ルート別OGPは JS では不可。初期は**共通OGPのみ**、将来 `/share/` 静的HTML。

- **共通OGP（P0・現行ゼロ）** を `index.html <head>` に追加:
  - `og:type=website` / `og:url`(絶対) / `og:title="k-ba-man | 円卓の10人が数字で席を守る"` / `og:description="10人のAI予想屋キャラクターによる集合知×競馬予想メディア。毎週の重賞を予想し、成績で席次が変動する。"` / `og:image`(絶対) + `width=1200 height=630 type=image/png alt` / `og:locale=ja_JP` / `og:site_name` / `twitter:card=summary_large_image` + title/description(短縮)/image/image:alt。
- **OGP画像**: 1200×630 PNG（WebP不可）・≤1MB・絶対URL。LINE正方形クロップ対策で**中央630×630**に主要素、X/FB対策で**中央1080×600**セーフゾーン。
- **favicon 3ファイル（P0）**: `favicon.svg`（円形Kバッジ・`prefers-color-scheme`で色反転・hex直書き）/ `favicon.ico`(32px) / `apple-touch-icon.png`(180px・透明不可)。
- **viewport-fit=cover（P0）**: safe-area 有効化（§3-3 と同時編集）。
- **manifest.webmanifest（P1）**: `theme_color/background_color=#0d0d14`、icons 192/512/512-maskable。
- **BASE_URL は単一定数管理**（プレースホルダ `https://k-ba-man.example.com`・デプロイ時一括置換）。
- **将来（P3）**: `site/share/characters/<id>.html`×10（`og:type=profile` + refresh/JSリダイレクト・Nodeビルド生成）。レース別は将来検討。

---

## 11. 物語的コンテンツ

物語要素は JSON データから算出可能な事実に基づく（人手で毎週書かない）。

- **週次ドラマ**: Overview ヒーロー直下の**単一ハイライトカード**（ticker/carousel ではない）。テンプレートエンジン `DRAMA_TEMPLATES{ bigRise, bigFall, collectiveHit, collectiveMiss, loneWolf }` から最大2件選出。`border-left:3px var(--gold)`、44px円アバター、矢印 up=`var(--status-up)`/down=`var(--status-down)`（§2-4 の 1概念=1トークン。順位下降は外れ赤ではなくオレンジ系 `#f97316`）、強調は `var(--accent)`。
- **答え合わせ**: 予想 vs 結果の2カラム Grid（`1fr 1fr`、620px以下で1カラム）。「勝ち筋」(how_won)は `border-left:3px var(--gold)` の callout（blockquote・`font-style:normal`・`line-height:1.7`）。
- **関係性**: 構造化データ `relationships:[{target_id,type,axis,reason}]`（`type∈{conflict,complement,foil}`）からのみ描画（本文からの名前抽出は禁止）。種別は**アイコン+ラベル**で区別（色は従）: `conflict ⚔ 対立`(amberティント) / `complement ⟷ 補完`(greenティント) / `foil ◇ 対照`(muted)。
  - **⚠ データ前提（P1 ブロッカー）**: 現行 app.js のキャラオブジェクトに `relationships` フィールドは**存在しない**。weakness 本文に「鉄平・吾郎」等の名前が埋め込まれた**旧方式が現存**（design-spec が禁止）。関係性UIを描画するにはキャラマスタに `relationships` を新設するのが前提（付録B も参照）。
- **ドラマブロック**（「この席に残る理由」）: 独立視覚ブロック。`border-left:3px var(--accent-mid)` + `background:color-mix(in oklch, var(--accent) 5%, var(--surface-1))` + 明朝(`--f-serif`) + mono大文字ラベル。
- **鮮度マーカー**: 右寄せ `<time>`（`font-size:0.7rem; color:var(--muted)`）。ライブヒーロー・成績テーブル右上・Overviewバナー。「データ更新はページ再読み込みで反映」を一度だけ。

---

## 12. CSS アーキテクチャ

- **単一 `styles.css`**（分割しない）+ **`@layer` 不採用**（specificity 制御済み・投資対効果低）。ソース順=カスケード順。
- **7セクション固定順序**（コメント区切り）:
  1. TOKENS → 2. RESET → 3. TYPOGRAPHY → 4. BRAND（キャラ色・セマンティック）→ 5. LAYOUT → 6. COMPONENTS → 7. PAGE-SPECIFIC
- 命名規約は §2-1。コンテナクエリは初期不採用（メディアクエリで足りる・P2で再利用フェーズに検討）。

---

## 13. 実装ロードマップ（P0 → P3）

### P0（即対応・基盤）
1. `color-mix` を全て `in oklch` に統一（既存 srgb 実21箇所置換）
2. surface トークン番号統一（`--surface-0..3` = 実測 oklch 0.156/0.187/0.220/0.255・border 0.240/0.279、現行hex忠実移行、無番号 `--surface`→`--surface-1`）
3. `--muted` を `oklch(0.62 0.04 270)` に修正（surface-0/1/2 で AA達成）
4. 余白トークン `--page-px/--space-section/--space-block/--space-gutter/--card-px`、`--max:1200px`、`--header-h:68px`
5. `body` に font-smoothing、全数値に `tabular-nums`
6. OGP 共通メタタグ + favicon 3ファイル + `viewport-fit=cover`
7. 全 `<img>` に width/height、全 script に `defer`、リストは DocumentFragment
8. mini.png → WebP ≤30KB（ビルドスクリプト + `<picture>`）
9. 降格圏3段階・席番号バッジ・ステータスピル(radius→999px)・ゲートストライプ変数化
10. **トークン正本の穴埋め**: `--gold/--gold-light/--gold-glow/--green/--red` を §2 に明記、`--status-*` を実体化して pill/dot/rank/arrow から `var()` 参照（リテラル hex を散らさない）
11. SPA ルートフォーカス管理 + route-announcer、`aria-sort`（アクティブ列のみ）、立ち絵 alt 3規則、フォーカスリングは `--accent-focus`
12. 静的SPA誠実ルール（カウントダウン禁止 等）
13. **ナビ5→4統合**: `#/ranking`+`#/races` → `#/results` の router 改修 + 旧ルートリダイレクト（§3-3）

### P1（コア体験）
- 立ち絵 `drop-shadow`（box-shadow 廃止）+ object-position 規則、`--accent` 派生 dim/mid/vivid 1箇所定義
- キャラカラー dim/mid/vivid 統一、**10色 oklch パレット刷新（sRGBガマット補正済・要オーナー承認）**
- フェーズステッパー(aria-current) + セグメント、CTA 3階層、ヒーロー高さ階層 + oklch オーバーレイ
- SVGアイコンスプライト導入（10本の実パス制作）、ロゴSVGパス化、ドラマブロック
- **キャラマスタに `relationships` 新設**（関係性UIの前提・現行は旧 weakness 名前埋め込み）→ 関係カード描画
- Critical CSS インライン、LCP fetchpriority、real.png WebP、FLIPソート、週次ドラマ/答え合わせ
- 5指標の解説パネル（成功基準#4）、暫定スコア式の表示
- フォント fallback metrics（88/22/100 初期値・CJK実測で確定）

### P2
- View Transitions（ページ/フェーズ/ヒーローモーフ）+ フォールバック、ボトムシート
- 動的ヒーロー（首位/フェーズ）、結果フェーズ サブタブ
- コンテナクエリ検討、ドラッグ閉じジェスチャ

### P3
- AVIF 対応（`avifenc` 導入後）、ページ別背景アート、`/share/` 静的HTML生成、相関図ページ

---

## 14. 成功基準（design-spec §9 への対応）

`design-spec.md` §9 の11基準を正本として維持。本書での対応指標を補足:

1. **5秒で理解** ← ヒーロー + 共通OGP（§5-1・§10）
2. **一覧のビジュアルインパクト（320px判読）** ← カード3層識別 + WebP軽量化（§4-1・§9）
3. **予想ライブの期待感** ← 3フェーズ漸進的開示 + 空状態（§5-2）
4. **指標の正確な読取** ← tabular-nums（§4-2）+ ソートUI（§4-4）+ **5指標の意味解説と暫定スコア式（§5-3）**
5. **モバイル劣化なし（320px）** ← 底部タブバー + ボトムシート + カラム変形（§3）
6. **2タップで予想ライブ** ← グローバルナビ + ライブバナー（§3-3・§5-1）
7. **ランキング変動のフック** ← 降格圏3段階 + 上昇/下降 + 直近3戦ドット（§4-4・§4-5）
8. **「外したとき何が起きるか」** ← ドラマブロック + 直近3戦 + 成績履歴接続（§11）
9. **結果フェーズが読み物** ← 答え合わせ2カラム + 勝ち筋 + 集合知ズレ（§11）
10. **共通OGPで世界観伝達** ← §10
11. **10人が「全員違う色」** ← 10色 oklch パレット刷新（色相分離最大化＋sub-30°5ペアはL/C分離・全色sRGBガマット内）+ 形状/アイコン/流派名併用（§2-3・§4-2）

---

## 付録A. 統合判断ログ（reconciliation 詳細）

§1 のサマリー表に対する根拠の補足。

- **R1 surface 実測値（v2 で是正）**: 現行 `#0b0c11/#111319/#181a24/#20222e` を標準 Oklab で実計算すると **L = 0.156 / 0.187 / 0.220 / 0.255**（`#000=0/#fff=1/#808080=0.6` で検証）。本書 v1 は re-plan §11 / motion 等が記した「`#0b0c11≒oklch0.11`」を**検算せず継承**し 0.11 起点を「忠実移行」と称したが、これは実値より約0.04暗く誤りだった（OKLab L は near-black で Y^(1/3) 的に立ち上がるため、naïve に 0.11 と感じる暗色も実は 0.156）。監査（technical + migration が独立に L0.156 を算出）で発覚し、v2 で実測値に修正。0.08（re-plan/css-arch 案）は実値からさらに遠いため不採用は維持。彩度・色相も実測値を採用（surface 4 段は C 0.011–0.023・hue 271–277、border 系を含む 6 トークンでは C 0.011–0.031・hue 271–279）。**教訓: 色値リテラルは変換器で検算してから載せる**（§0 の検算ルール参照）。
- **R2 `--accent` 維持**: live app.js が `.character-card / .live-expert-card / .rank-row / .profile-hero` 等で既に `style="--accent:…"` を注入し、styles.css は `var(--accent)` を読む。spec/research の `--char-color` 表記は最小チャーンのため `--accent` に正規化。icons エージェントは逆方向（`--char-color` へ改名）を推奨したが稼働JSを壊すため不採用。
- **R3 混合相手 surface-0**: 「微かに色味を帯びた暗色」へ減光する design-spec の意図に合致。css-arch の `transparent` 混合（半透明色を生む）は overlay/border 用途に限り `--accent-glow` として別途許可。
- **R9 パレット刷新は P1 + 要承認**: re-plan が「色相渋滞」を要改定と明記し、color エージェントが完全 oklch パレットを確定。ただし全10キャラの色変更はサイトの視覚的 identity を変えるためオーナー承認案件とし、現行hexでも全機能が動作することを明記。
- **R10 fallback metrics（v2 で出典是正）**: 正しい出典は **research-typography.md と research-performance.md がともに 88/22/100（Noto）を提案**し、`105/25/102` は **design-spec-re-plan.md 由来**。本書 v1 は「typography=105/25/102 / performance=88/22/100」と取り違えていた（監査で発覚）。v2 では research 由来の **88/22/100 を初期値**として採用し、実フォントの CJK メトリクスを Fontaine/capsize で計測して最終確定する。
- **R9 ガマット補正（v2 で追加・v2.1 で再検算是正）**: color エージェントの当初 10 oklch のうち **makoto(C0.10)/teppei(0.13)/aoi(0.17)/hina(0.17)/yuko(0.092) の5色が sRGB ガマット外**だった（各 L/H の実測最大彩度は 0.094 / 0.107 / 0.142 / 0.154 / 0.091）。ブラウザのクリップにより指定色から色相・彩度がズレるため、a11y エージェントがこれを指摘し、technical エージェントは誤って「全色ガマット内」と判定した（＝監査の未決点F）。**`python3` 実計算で a11y 側が正しいと確定**。各 C を上限内へ補正（makoto 0.088 / teppei 0.102 / aoi 0.138 / hina 0.15）。**ただし v2 の yuko 補正値 0.092 は実上限 0.091 をなお 0.001 超過しており（v2 の検算漏れ・列挙 hex `#12745d` も L0.50 で算出した誤り）、v2.1 で yuko を 0.085 に再補正**して全10色を確実にガマット内へ収めた（レンダリング `#136a55`）。併せて teppei↔goro の分離が弱かったため goro を L0.45・yuko を L0.47 に調整。sub-30° は実5ペア（確定 goro=112° での実測）で各 dL≥0.07 を確保。

## 付録B. 実装時に確定すべきオープン課題

1. **デプロイ先ドメイン**未確定（`og:url`/`og:image`/manifest の絶対URL・サブパス配信時の favicon ルート絶対パス）。
2. **共有用キャラマスタJSON**（`data/characters.json`）が未整備。`/share/` 生成時に必要。
3. **OGP共通画像 `og-default.png`** の実制作（集合ビジュアルの流用 or 専用デザイン）。
4. **SVGアイコン10本の実パス**（research はプレースホルダのみ）。
5. **席番号バッジの白文字AA**（v2 で実計算済）: 補正後パレットで白文字未達は **hina のみ**（4.2:1）→ `.seat-badge--light-bg` で暗文字（4.7:1）。kenta(4.59)/makoto(4.66) は境界値のため実機/レンダラで再確認。他は白で安全。
6. **フォント fallback metrics の CJK 実測値**（88/22/100 は初期値・Fontaine/capsize で確定）。
7. **`--muted`（L=0.62）の surface-3 上**: S0/S1/S2 は AA達成済（実計算）。S3(modal) は 4.3:1 のため、modal 上のメタは `--text` を使うルールの徹底。
8. **降格圏ソート時のNaN/null順**（3戦未満の参考行を末尾固定するか）＝データスキーマと突合。
9. **ステータスピル：現行 `border-radius:3px` → `999px`** への変更を実施（pill形状）。oklch 目標値↔現行rgba の差は将来移行で吸収。
10. **`view-transition-name` の命名衝突回避**（hero-main / char-`<id>` / phase-content の同名同時存在防止。`<main>` には名前を付けず root に委ねる＝§6）。
11. **next-hint/empty-state の radius 8px ↔ `--radius-md` 6px** の統一、完了ステップのチェックSVG実体。
12. **active_phase の前後判定基準**（is-completed/current/pending をデータ契約として明文化）。
13. **キャラマスタ `relationships` の新設**（§11 関係性UIの前提・現行は旧 weakness 名前埋め込み）。
14. **デプロイ後の oklch surface の実機確認**（変換誤差で現行 hex と知覚差が出ないか・必要なら hex 据え置きも可）。

## 付録C. v2.1 是正ログ（全数値の再検算）

監査の根因所感（「上流の数値を検算せず継承した」）は v2 自身にも一部当てはまった。v2 が監査を反映する際に**新たに載せた数値**のいくつかが未検算だったため、v2.1 で全色値・コントラスト比・色相差を `python3` の標準 Oklab 実装（`#000=0/#fff=1/#808080=0.6`・sRGB ガマット判定・WCAG 相対輝度）で総当たり検算し、以下4件を是正した。**検算が通った主要値**（surface/border 6トークンの oklch、10色中9色のガマット、`--accent-focus` の `#dc8fd5`・対 surface 6.7〜8.3:1、`--muted` 5.4/5.1/4.7/4.3、席バッジ白文字 hina 4.2・kenta 4.59・makoto 4.66・teppei 5.6・hina暗文字 4.7）は**そのまま確定**。

| # | 箇所 | v2 の誤り | v2.1 の確定値 | 根拠 |
|---|---|---|---|---|
| 1 | §2-3 yuko | `oklch(0.47 0.092 172)`＝「全色ガマット内」と称したが C0.092 は L0.47/H172 の上限 **0.091** を超過しクリップ（実レンダリングは `#006b55`、列挙 hex `#12745d` も L0.50 で算出した誤り） | **`oklch(0.47 0.085 172)` → `#136a55`**（上限内・他補正色と同等の余裕 0.006） | sRGB ガマット実計算。これで「全色ガマット内」が真になる |
| 2 | §2-3 / §14 / 付録A | sub-30° を「**6ペア**」と記載 | **5ペア**（sakura-tatsunosuke 20°・tatsunosuke-hina 24°・teppei-goro 27°・goro-kenta 26°・yuko-makoto 28°） | 監査の「6」は goro=110° 前提。本書確定の **goro=112°** で再計算すると5ペア。表自体は元から5行＝表が正・見出しが誤りだった |
| 3 | §2-5 テキスト色 | `--ink` 対 S1/S2 を **13.6/11.2**、`--text` を **6.6/5.4** と過小記載（監査は S0 列のみ検証していた） | `--ink` **15.4/14.4**、`--text` **7.5/7.0**（S0 の 16.2/7.9 は正） | WCAG 相対輝度実計算。可否（✓）は元から正しいが数値が不正確だった |
| 4 | §4-1 フォーカスリング | accent-vivid 3:1 未達を「tatsunosuke/misaki/goro/**aoi**/yuko」と記載 | 未達は **tatsunosuke 2.40 / goro 2.53 / misaki 2.84 / yuko 2.86 の4色**（aoi は **3.09** で僅少ながら合格、teppei 3.34・sakura 3.43 も僅少）。`--accent-focus` 採用の結論は不変 | 対 surface-1 コントラスト実計算 |

**併せて整合性監査（独立3観点の再検証）で是正した項目**（数値誤りではなく自己矛盾・継承誤り）:

- **順位下降アローの色**: §11 週次ドラマが `down=--red` としていたが、§2-4 の `--status-down`（`#f97316` オレンジ）と矛盾（線526「矢印は --status-* を参照」違反）。`var(--status-down)` に統一。
- **ステータス文字色のリテラル散在**: `.status-pill.*`／`.rank-number--danger` が `#f87171`/`#a5b4fc` を直書きしており「リテラルを散らさない」原則に反していた。`--status-win-text/-place-text/-out-text` を §2-4 に新設し component から `var()` 参照。
- **`--shadow-1/2/3` の自己言及未達**: 「component から参照する」と書きつつ実 CSS に `var(--shadow-*)` が無かった。`.character-card`→`--shadow-1`、`.bottom-sheet`→`--shadow-3` を実際に付与（監査 B6 を完全クローズ）。
- **ライブグローバル名の誤り**: §5-1 の `window.KBAMAN_LIVE_RACE` は実コードに存在せず、実体は `window.KBAMAN_LiveRaceApi`（`loadDataset()`→`LIVE_EVENT`）。**監査 B16 自体が誤っており**、v2 がそれを継承していた（`app.js:1653` で確認）。
- **ティント混合相手の明文化**: コンテナ上ワンオフ・ティント（カード画像背景・ドラマブロック）が `--surface-1` 混合で、R3 の `--surface-0` 方針と一見矛盾 → §2-3 に例外として明記。
- 軽微: surface の C/hue レンジ表記（付録A）、席バッジ白文字レンジ下限（4.59）、status 色 L レンジ（0.54–0.74）を実測に合わせて修正。

> 運用反映: §0「色値の検算ルール」を v2.1 でも実行した記録。今後も oklch/hex/コントラスト/色相差は載せる前に変換器で総当たり検算し、token は「定義＝参照」で穴・散在を作らない。
