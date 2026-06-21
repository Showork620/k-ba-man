# k-ba-man デザイン規約

競馬予想メディア「k-ba-man」のビジュアルシステム。ダーク背景にゴールドアクセントを持つ日本語対応テーマ。

## スタイルの適用方法

React 等のフレームワークでこのデザイン言語を再現する場合、`styles.css` をインポートして CSS カスタムプロパティとクラスを使ってください。プロバイダーコンポーネントは不要です。

```jsx
import './styles.css';
// または <link rel="stylesheet" href="styles.css" />
```

`<html>` 要素か最上位コンテナに `color-scheme: dark` が適用されている前提です。`body` は `background: var(--bg)` / `color: var(--text)` で初期化されます。

## スタイルのイディオム：CSS カスタムプロパティ + クラス

ユーティリティクラスではなく、**意味のあるコンポーネントクラス**を使います。色は CSS カスタムプロパティ（`var(--*)`）で指定します。

### キャラクターアクセントカラー
カードや行コンポーネントは `--accent` を受け取ります。インラインスタイルで渡してください：

```jsx
<div className="character-card" style={{ '--accent': '#7f1d1d' }}>
```

10人分のアクセント: 龍之介 `#7f1d1d` / 誠 `#0f766e` / 美咲 `#6d28d9` / 健太 `#15803d` / 鉄平 `#a16207` / さくら `#be123c` / 葵 `#1d4ed8` / 陽菜 `#ea580c` / 優子 `#047857` / 吾郎 `#854d0e`

## 重要トークン

| トークン | 値 | 用途 |
|---|---|---|
| `--bg` | #0b0c11 | ページ背景 |
| `--surface` | #111319 | カード背景 |
| `--surface-2` | #181a24 | ホバー状態 |
| `--ink` | #edeae0 | 見出し・強調テキスト |
| `--text` | #a8a59c | 本文 |
| `--muted` | #62647a | ラベル・メタ情報 |
| `--gold` | #c9a840 | アクセント・ボタン |
| `--gold-light` | #dfc060 | ホバー時のゴールド |
| `--gold-dim` | rgba(201,168,64,.10) | 選択状態背景 |
| `--border` | #1c1e2c | カード枠線 |
| `--border-mid` | #252738 | インタラクティブ枠線 |
| `--f-serif` | Yu Mincho / HiraMinProN-W3 | 見出し・キャラ名 |
| `--f-sans` | Hiragino Sans / Yu Gothic UI | 本文 |
| `--f-mono` | Menlo / Consolas | ラベル・指標数値 |

## スタイルの参照先

- `styles.css` — トークン定義・全コンポーネントクラス
- `components/<group>/<Name>/<Name>.prompt.md` — 各コンポーネントの使い方

## 実装例

```jsx
// キャラクターカード
<a className="character-card" href={`/characters/${id}`} style={{ '--accent': color }}>
  <div className="card-media">
    <span className="seat-badge">{seat}</span>
    <img src={`assets/characters/${id}/mini.png`} alt={name} loading="lazy" />
  </div>
  <div className="card-copy">
    <span>Seat {seat}</span>
    <h2>{name}</h2>
    <p>{alias}</p>
    <small>Brier {brier} / {statusLabel}</small>
  </div>
</a>
```
