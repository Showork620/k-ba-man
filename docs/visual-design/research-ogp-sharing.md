# OGP・SNS共有・favicon 調査結果

design-spec.md §7 の OGP・SNS共有要件を実現するために必要な知識と実装パターンをまとめる。

---

## 1. ハッシュSPA と OGP の根本的制約

### 1-1. 問題の本質

SNS クローラ（Facebook, Twitter/X, LINE, Discord 等）は JavaScript を実行しない。`#` 以降のフラグメントはサーバーに送信されず、クローラは全ルートを同一ページとして認識する。

```
https://example.com/site/#/characters/tatsunosuke
                          ↑ クローラはここまでしか見ない
```

つまり `#/characters/:id` や `#/live/result` ごとに異なる OGP を出し分けることは、クライアント JS だけでは不可能。

### 1-2. design-spec の方針（正しい判断）

design-spec §7-1 の方針「初期は共通 OGP、ページ別 OGP は共有用静的 HTML で対応」は、この制約を正しく認識した設計。`document.title` やメタタグの JS 書き換えは SNS クローラに効かないため不可。

### 1-3. 解決策の選択肢

| 方式 | 複雑度 | k-ba-man での適合性 |
|---|---|---|
| **共通 OGP のみ（初期）** | 最小 | ◎ 最初はこれで十分 |
| **共有用静的 HTML 生成（将来）** | 中 | ◎ ビルドスクリプトで生成 |
| History API ルーティング移行 | 大 | △ SPA 全体の変更が必要 |
| Edge Worker で UA 判定・動的差し替え | 大 | △ ホスティング依存 |
| プリレンダリングサービス（Prerender.io 等） | 中 | △ 外部依存 |

**推奨**: 初期は共通 OGP → 将来 `/share/` 静的 HTML 生成の 2 段階。

---

## 2. 共通 OGP メタタグの実装

### 2-1. 必須タグ（現行 index.html に追加すべきもの）

現行の `index.html` には OGP タグが未設定。以下を `<head>` 内に追加する。

```html
<!-- OGP 基本 -->
<meta property="og:type" content="website" />
<meta property="og:url" content="https://k-ba-man.example.com/" />
<meta property="og:title" content="k-ba-man | 円卓の10人が数字で席を守る" />
<meta property="og:description" content="10人のAI予想屋キャラクターによる集合知×競馬予想メディア。毎週の重賞を予想し、成績で席次が変動する。" />
<meta property="og:image" content="https://k-ba-man.example.com/assets/ogp/og-default.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/png" />
<meta property="og:image:alt" content="k-ba-man 10人の予想屋キャラクター集合ビジュアル" />
<meta property="og:locale" content="ja_JP" />
<meta property="og:site_name" content="k-ba-man" />

<!-- Twitter/X Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="k-ba-man | 円卓の10人が数字で席を守る" />
<meta name="twitter:description" content="10人のAI予想屋キャラクターによる集合知×競馬予想メディア" />
<meta name="twitter:image" content="https://k-ba-man.example.com/assets/ogp/og-default.png" />
<meta name="twitter:image:alt" content="k-ba-man 10人の予想屋キャラクター集合ビジュアル" />
```

### 2-2. 注意点

- `og:url` は正規 URL（`#` なし）を指定。ハッシュ部分は含めない
- `og:image` は**絶対 URL** が必須（相対パス不可）
- Twitter/X は OGP にフォールバックするが、`twitter:card` だけは明示が必要
- `og:image:alt` は 2025 年以降のアクセシビリティ要件で推奨度が上がっている

---

## 3. OGP 画像の仕様

### 3-1. サイズと形式

| 項目 | 推奨値 | 備考 |
|---|---|---|
| サイズ | **1200×630px** | 1.91:1 比率。2026年は 1200×600（2:1）も台頭しているが、1200×630 が最も安全 |
| 形式 | PNG or JPG | PNG はテキスト明瞭、JPG は写真向き |
| ファイルサイズ | 1MB 以下 | 8MB まで許容するプラットフォームもあるが、1MB 以下を目標 |
| セーフゾーン | 中央 1080×600px | 端 60px はクロップされる可能性。テキストや顔は中央に |

### 3-2. プラットフォーム別の表示差異

| プラットフォーム | カードタイプ | 画像比率 | 備考 |
|---|---|---|---|
| **Twitter/X** | summary_large_image | 2:1（1200×600） | 1200×630 でも上下がわずかにクロップ。セーフゾーン内なら問題なし |
| **Facebook** | — | 1.91:1（1200×630） | OGP の元祖。この比率に最適化 |
| **LINE** | — | **正方形にクロップ** | 横長画像の中央部分が正方形にトリミングされる。重要な要素を中央に配置必須 |
| **Discord** | — | 1.91:1 | 標準 OGP タグで表示。特別な設定不要 |
| **Slack** | — | 1.91:1 | Discord 同様 |
| **はてなブックマーク** | — | 1.91:1 | 国内サービスも OGP 準拠 |

### 3-3. LINE 対応の注意

LINE はリンクプレビューで画像を**正方形にクロップ**する。k-ba-man の OGP 画像を設計する際:

- 10人集合ビジュアルを使う場合、中央 630×630px にキャラクターが収まるよう配置
- テキスト要素（サイト名、キャッチコピー）も中央寄せ
- 左右端にはみ出すキャラクターは LINE では見切れる

### 3-4. OGP 画像の設計方針

```
┌──────────────────────────────────────┐
│         1200 × 630px                  │
│  ┌──────────────────────────────┐     │
│  │     セーフゾーン 1080×600     │     │
│  │  ┌────────────────────┐      │     │
│  │  │ LINE セーフ 630×630│      │     │
│  │  │   サイト名          │      │     │
│  │  │   キャラ集合絵      │      │     │
│  │  │   キャッチコピー    │      │     │
│  │  └────────────────────┘      │     │
│  └──────────────────────────────┘     │
└──────────────────────────────────────┘
```

---

## 4. 将来の共有用静的ページ

### 4-1. ディレクトリ構造

```
site/
├── share/
│   ├── characters/
│   │   ├── tatsunosuke.html
│   │   ├── makoto.html
│   │   └── ... (10人分)
│   └── races/
│       ├── 2024-takarazuka-kinen.html
│       └── ...
├── index.html  (SPA 本体)
└── ...
```

### 4-2. 共有用 HTML のテンプレート

各ファイルは OGP メタタグだけ持ち、`<script>` で SPA にリダイレクトする。

```html
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>龍之介 — 血統の系譜を読む者 | k-ba-man</title>

  <!-- OGP (キャラクター固有) -->
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="https://k-ba-man.example.com/share/characters/tatsunosuke.html" />
  <meta property="og:title" content="龍之介 — 血統の系譜を読む者 | k-ba-man" />
  <meta property="og:description" content="血統・配合の視点で着順を予想する、円卓の第一席。" />
  <meta property="og:image" content="https://k-ba-man.example.com/assets/ogp/characters/tatsunosuke.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="龍之介 — 血統の系譜を読む者" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:site_name" content="k-ba-man" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="龍之介 — 血統の系譜を読む者 | k-ba-man" />
  <meta name="twitter:image" content="https://k-ba-man.example.com/assets/ogp/characters/tatsunosuke.png" />

  <!-- SPA へリダイレクト（クローラには見えない） -->
  <meta http-equiv="refresh" content="0;url=../#/characters/tatsunosuke" />
</head>
<body>
  <p>リダイレクト中... <a href="../#/characters/tatsunosuke">こちら</a></p>
  <script>
    window.location.replace('../#/characters/tatsunosuke');
  </script>
</body>
</html>
```

### 4-3. ビルドスクリプト（Node.js）

キャラクターマスタ JSON から共有用 HTML を自動生成するスクリプトのパターン:

```javascript
// scripts/generate-share-pages.js
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const TEMPLATE = readFileSync('scripts/templates/share-character.html', 'utf-8');
const characters = JSON.parse(readFileSync('data/characters.json', 'utf-8'));
const BASE_URL = 'https://k-ba-man.example.com';

for (const char of characters) {
  const html = TEMPLATE
    .replace(/{{name}}/g, char.name)
    .replace(/{{title}}/g, char.subtitle)
    .replace(/{{id}}/g, char.id)
    .replace(/{{description}}/g, char.intro)
    .replace(/{{base_url}}/g, BASE_URL);

  const dir = `site/share/characters`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${char.id}.html`, html);
}
```

### 4-4. キャラクター別 OGP 画像の生成

キャラクター別 OGP 画像（1200×630px）は以下のいずれかで生成:

| 方式 | 特徴 |
|---|---|
| **手動デザイン** | 品質最高。10人分なので現実的 |
| **Canvas API スクリプト** | Node.js の `canvas` パッケージで立ち絵 + テキスト + 背景を合成 |
| **HTML → 画像変換** | Puppeteer で HTML テンプレートをスクリーンショット。CSS でレイアウト可 |

k-ba-man は 10 人固定なので手動デザインが最も品質が高い。レース結果ページは数が増えるため、将来的にはスクリプト生成を検討。

---

## 5. favicon / ブランドマーク

### 5-1. 2025-2026 年の favicon ベストプラクティス

**最小限の 3 ファイル構成**（Evil Martians 推奨、2026 年更新版）:

```html
<!-- favicon: SVG（モダンブラウザ）+ ICO（レガシー） -->
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />

<!-- Web App Manifest -->
<link rel="manifest" href="/manifest.webmanifest" />
```

### 5-2. SVG favicon の利点

- **ダークモード対応**: CSS メディアクエリで色を切り替え可能
- **無限スケーリング**: どのサイズでも鮮明
- **軽量**: 複数サイズの PNG を用意する必要がない

```svg
<!-- favicon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    circle { fill: #1a1a2e; }
    text { fill: #e8d5b7; font-family: serif; font-weight: bold; }
    @media (prefers-color-scheme: light) {
      circle { fill: #e8d5b7; }
      text { fill: #1a1a2e; }
    }
  </style>
  <circle cx="16" cy="16" r="16" />
  <text x="16" y="22" text-anchor="middle" font-size="20">K</text>
</svg>
```

### 5-3. favicon.ico の生成

favicon.ico は 32×32px の ICO 形式。SVG から生成:

```bash
# ImageMagick で SVG → ICO 変換
magick favicon.svg -resize 32x32 favicon.ico

# 複数サイズ埋め込み（16, 32, 48）
magick favicon.svg -resize 16x16 -resize 32x32 -resize 48x48 favicon.ico
```

### 5-4. Apple Touch Icon

- **サイズ**: 180×180px（他サイズは iOS が自動ダウンスケール）
- **形式**: PNG
- **背景**: 透明不可。iOS が自動で角丸処理する
- **デザイン**: ロゴマーク「K」の円形バッジ。背景はダークテーマのメインカラー

```html
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

### 5-5. manifest.webmanifest

```json
{
  "name": "k-ba-man",
  "short_name": "k-ba-man",
  "description": "円卓の10人が数字で席を守る — 集合知×競馬予想メディア",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0d0d14",
  "theme_color": "#0d0d14",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

### 5-6. Maskable Icon の注意

- Android のアダプティブアイコンに対応
- 安全領域は中央 **66%**（外側 17% は OS がマスクする）
- 「K」のロゴマークを中央 66% 内に収める
- 背景色をアイコン全体に敷く（透明不可）

---

## 6. デバッグ・検証ツール

### 6-1. 各プラットフォームの OGP デバッガー

| プラットフォーム | ツール | 用途 |
|---|---|---|
| Facebook | [Sharing Debugger](https://developers.facebook.com/tools/debug/) | OGP キャッシュクリア + プレビュー |
| Twitter/X | Twitter Card Validator（2024年廃止 → 代替: ポスト作成画面のプレビュー） | カード表示確認 |
| LINE | [LINE OGP Checker](https://poker.line.naver.jp/) （非公式） | LINE でのプレビュー確認 |
| 汎用 | [RAKKO Tools OGP Checker](https://en.rakko.tools/tools/9/) | 複数 SNS 横断チェック |
| 汎用 | [OpenGraph.xyz](https://www.opengraph.xyz/) | リアルタイムプレビュー |

### 6-2. OGP キャッシュの注意

- Facebook はキャッシュが強い。画像を変更したら Sharing Debugger で「スクレイプし直す」が必要
- Twitter/X は 2024 年に Card Validator を廃止。実際にツイートを下書きしてプレビューで確認
- LINE は URL を貼るとキャッシュされ、更新が反映されにくい。URL パラメータ（`?v=2`）で回避可能

---

## 7. 実装ロードマップ

### Phase 1: 共通 OGP（即時対応）

1. `index.html` の `<head>` に OGP + Twitter Card メタタグを追加
2. 1200×630px の共通 OGP 画像を作成（10人集合ビジュアル or ヒーローアート）
3. SVG favicon + favicon.ico + apple-touch-icon を設置
4. manifest.webmanifest を作成

### Phase 2: ブランドアイデンティティ強化（デザイン刷新時）

1. ロゴマーク「K」の確定デザインから各サイズの favicon/icon を生成
2. OGP 画像をデザイン刷新後のビジュアルに差し替え
3. `theme_color` をリニューアル後のカラーシステムに合わせる

### Phase 3: ページ別 OGP（将来）

1. キャラクター別 OGP 画像（1200×630px × 10枚）を制作
2. 共有用静的 HTML 生成スクリプトを実装
3. サイト内に「共有」ボタンを設置（`/share/characters/<id>.html` の URL をコピー）
4. レース結果の共有ページ・OGP 画像生成を検討

---

## 8. 現行 index.html との差分

現行の `index.html` に不足している要素:

| 項目 | 現状 | 必要な対応 |
|---|---|---|
| OGP メタタグ | なし | §2 の全タグを追加 |
| Twitter Card | なし | `twitter:card` 等を追加 |
| favicon | なし | SVG + ICO + apple-touch-icon |
| manifest | なし | webmanifest ファイル作成 |
| og:image 画像 | なし | 1200×630px 画像制作 |
| `viewport-fit=cover` | なし | safe-area 対応のため追加 |

`<meta name="viewport">` も更新が必要:

```html
<!-- 現行 -->
<meta name="viewport" content="width=device-width, initial-scale=1" />

<!-- 推奨（safe-area 対応） -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

## 参考リンク

- [Open Graph Tags: Boost Social Sharing and SEO in 2026](https://www.imarkinfotech.com/open-graph-tags-boost-social-sharing-and-seo-in-2026/)
- [Open Graph Protocol: Complete Social Sharing Guide (2026)](https://env.dev/guides/opengraph)
- [OG Image Size (2026): 1200x630 Guide](https://og-image.org/learn/og-image-size)
- [Twitter Card Image Size (2026)](https://og-image.org/learn/twitter-card-size)
- [Social Preview Image Sizes (2026)](https://og-image.org/sizes)
- [How to Favicon in 2026: Three files that fit most needs — Evil Martians](https://evilmartians.com/chronicles/how-to-favicon-in-2021-six-files-that-fit-most-needs)
- [Favicon Best Practices for Modern Web Apps in 2025](https://dev.to/albert_nahas_cdc8469a6ae8/favicon-best-practices-for-modern-web-apps-in-2025-3jkd)
- [Define your app icons — MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Define_app_icons)
- [OG Image Sizes 2026: Facebook, X, LinkedIn](https://www.krumzi.com/blog/open-graph-image-sizes-for-social-media-the-complete-2026-guide)
- [7 Common SPA SEO Challenges and Solutions](https://prerender.io/blog/spa-javascript-seo-challenges-and-solutions/)
- [Why SPAs Still Struggle with SEO in 2025](https://dev.to/arkhan/why-spas-still-struggle-with-seo-and-what-developers-can-actually-do-in-2025-237b)
- [RAKKO Tools OGP Checker](https://en.rakko.tools/tools/9/)
