# StatTile

統計指標を1つ表示するタイル。`.summary-strip` に並べて KPI サマリーとして使います。

```html
<div class="stat-tile">
  <span>ラベル</span>
  <strong>値</strong>
  <small>補足テキスト</small>
</div>
```

## グリッドレイアウト
`.summary-strip` クラスで4列グリッドに展開します：

```html
<section class="summary-strip">
  <div class="stat-tile">...</div>
  <!-- × 4 -->
</section>
```

## 見た目
- 背景 `var(--surface)`・枠 `var(--border)`
- ラベル・補足: `--f-mono` 0.7rem `--muted`
- 値: `--f-mono` `clamp(1.2rem, 2vw, 1.8rem)` `--ink` bold
- モバイルでは2列に折れる
