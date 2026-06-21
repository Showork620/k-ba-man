# Button

クリック可能なアクション要素。`<a>` または `<button>` に `.button` + variantクラスを付けます。

```html
<a class="button primary" href="#">現在のランキングを見る</a>
<a class="button secondary" href="#">10人を読む</a>
```

## バリアント
| クラス | 外観 | 用途 |
|---|---|---|
| `.button.primary` | `--gold` 背景・暗いテキスト | 主要アクション（1ページ1つが目安） |
| `.button.secondary` | 透明背景・`--border-mid` 枠 | 補助アクション |

## 特性
- `min-height: 46px`（タッチターゲット確保）
- ホバーで `translateY(-1px)`
- `font-weight: 700`、`font-size: 0.9rem`
- `border-radius: var(--radius)` (3px)
- モバイルでは `.hero-actions` 内に置くと `flex-direction: column; width: 100%` になる
