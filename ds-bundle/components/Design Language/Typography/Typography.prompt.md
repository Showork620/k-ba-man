# Typography — k-ba-man タイポグラフィ

## フォントスタック（CSS カスタムプロパティ）

```css
--f-serif: 'Yu Mincho', 'HiraMinProN-W3', serif;         /* 見出し・引用 */
--f-sans:  'Hiragino Sans', 'Yu Gothic UI', system-ui, sans-serif;  /* 本文 */
--f-mono:  'Menlo', 'Consolas', monospace;                /* ラベル・指標 */
```

## 使い分け
- `--f-serif`: `h1`・`h2`・`blockquote`・キャラクター名（`.card-copy h2`）
- `--f-sans`: 本文（`p`・`.lead`）・グローバルデフォルト
- `--f-mono`: `.eyebrow`・`.section-kicker`・数値指標（Brier・スコア）・ナビリンク

## タイプスケール
| 要素/クラス | サイズ | フォント |
|---|---|---|
| `h1` | `clamp(2.2rem, 5.5vw, 5rem)` | serif |
| `h2` | `clamp(1.5rem, 2.8vw, 2.4rem)` | serif |
| `h3` | `1rem` | sans |
| `.eyebrow` / `.section-kicker` | `0.72rem` uppercase | mono |
| `.lead` | `clamp(0.95rem, 1.3vw, 1.08rem)` | sans |
| 指標数値 | 1.2–1.8rem | mono・`font-variant-numeric: tabular-nums` |

## 数値表示のルール
指標・スコア・割合を表示するときは `font-variant-numeric: tabular-nums` を必ず指定して桁ずれを防ぎます。
