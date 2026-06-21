# StatusPill

本命馬の着順結果を示すバッジ。テーブルセルや行内でインラインに使います。

```html
<span class="status-pill win">◎1着</span>
<span class="status-pill place">◎3着内</span>
<span class="status-pill out">◎圏外</span>
```

## バリアント
| クラス | 色 | 意味 |
|---|---|---|
| `.status-pill.win` | ゴールド系 | 本命が1着 |
| `.status-pill.place` | 紫 (#a5b4fc) | 本命が2〜3着 |
| `.status-pill.out` | 赤 (#f87171) | 本命が圏外 |

## 特性
- `min-height: 26px`・`font-family: var(--f-mono)` 0.72rem bold
- `border-radius: var(--radius)` (3px)
