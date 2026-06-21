# Ranking — ランキングページ

ページイントロ（`.page-intro`）+ ソートコントロール（`.segmented`）+ リーダーボード（`.leaderboard`）の組み合わせ。

## 構造
```html
<section class="page-intro">
  <p class="eyebrow">Ranking</p>
  <h1>いま誰の成績がいいか</h1>
  <p class="lead">...</p>
  <p class="notice">...</p>
  <div class="segmented" role="group">
    <button type="button" class="is-selected">暫定席次</button>
    <button type="button">Brier</button>
    <button type="button">◎結果</button>
    <button type="button">LogLoss</button>
  </div>
</section>
<section class="leaderboard">
  <!-- 10 × rank-row -->
</section>
```

## `.segmented` ソートコントロール
選択中のボタンに `.is-selected` を付けます → `background: var(--gold-dim)`・`border-color: var(--gold)`・`color: var(--gold-light)`

## `.notice`
`--amber` 左ボーダーの警告インセット。`background: rgba(184,116,0,.08)` + `color: #e8a840`

## `.page-intro`
ページ上部の見出しエリア。`padding: clamp(48px, 8vw, 90px)` のトップパディング付き。
