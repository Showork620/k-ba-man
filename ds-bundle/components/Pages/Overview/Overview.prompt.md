# Overview — トップページ

ヒーローセクション（`.hero-band`）とサマリーストリップ（`.summary-strip`）の組み合わせ。

## 構造
```html
<section class="hero-band">
  <div class="hero-copy">
    <p class="eyebrow">競馬予想 × 人間ドラマ</p>
    <h1>...</h1>
    <p class="lead">...</p>
    <div class="hero-actions">
      <a class="button primary" href="#">...</a>
      <a class="button secondary" href="#">...</a>
    </div>
    <p class="hero-motto">...</p>
  </div>
  <div class="hero-visual">
    <img src="assets/characters/real.png" alt="10人集合ビジュアル">
  </div>
</section>
<section class="summary-strip">
  <!-- 4 × stat-tile -->
</section>
```

## ポイント
- `.hero-band` は2列グリッド（コピー側 + ビジュアル側）。880px以下で1列に折れる
- `::after` 擬似要素が下端に10キャラクター分の4px カラーストライプを描画（ゲート演出）
- `.hero-motto` は `--f-serif` イタリック・`--faint` 左ボーダー
- 背景に薄いゴールドの楕円グラデーション
