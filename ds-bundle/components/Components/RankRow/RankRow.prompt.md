# RankRow

ランキング1行。`.leaderboard` グリッド内に並べます。

```html
<article class="rank-row" style="--accent: #7f1d1d">
  <div class="rank-position">1</div>
  <a class="rank-person" href="/characters/tatsunosuke">
    <img src="assets/characters/tatsunosuke/mini.png" alt="" loading="lazy">
    <span>
      <strong>龍之介</strong>
      <small>血筋の語り部</small>
    </span>
  </a>
  <div class="rank-metric"><span>暫定席次</span><strong>72.7</strong></div>
  <div class="rank-metric"><span>Brier</span><strong>0.6997</strong></div>
  <div class="rank-metric"><span>最新◎</span><strong>◎1着</strong><small>16 メイショウタバル</small></div>
  <div class="rank-metric"><span>3着内網羅</span><strong>3/3</strong></div>
</article>
```

## 構造
- 6列グリッド: 順位番号 / 人物（画像＋名前）/ 指標×4
- 左ボーダーに `--accent`（キャラクターカラー）
- ホバーで `background: var(--surface-2)`

## `.rank-metric` の構造
```html
<div class="rank-metric">
  <span>ラベル</span>         <!-- 0.68rem mono muted -->
  <strong>値</strong>         <!-- 1.05rem mono ink bold -->
  <small>補足（任意）</small> <!-- 0.68rem mono muted -->
</div>
```

## `.leaderboard` コンテナ
```html
<section class="leaderboard">
  <!-- N × rank-row -->
</section>
```
