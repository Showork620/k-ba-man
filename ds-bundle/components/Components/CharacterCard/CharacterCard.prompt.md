# CharacterCard

予想屋1人を表すカード。`.character-grid`（5列グリッド）に並べます。

```html
<a class="character-card" href="/characters/tatsunosuke" style="--accent: #7f1d1d">
  <div class="card-media">
    <span class="seat-badge">01</span>
    <img src="assets/characters/tatsunosuke/mini.png" alt="龍之介" loading="lazy">
  </div>
  <div class="card-copy">
    <span>Seat 01</span>
    <h2>龍之介</h2>
    <p>血筋の語り部</p>
    <small>Brier 0.6997 / ◎1着</small>
  </div>
</a>
```

## `--accent` カスタムプロパティ（必須）
`card-media` のグラデーション背景・ホバーボーダー・`seat-badge` 背景色に使われます。

| キャラクター | `--accent` |
|---|---|
| 龍之介 | `#7f1d1d` |
| 誠 | `#0f766e` |
| 美咲 | `#6d28d9` |
| 健太 | `#15803d` |
| 鉄平 | `#a16207` |
| さくら | `#be123c` |
| 葵 | `#1d4ed8` |
| 陽菜 | `#ea580c` |
| 優子 | `#047857` |
| 吾郎 | `#854d0e` |

## グリッド
```html
<section class="character-grid">
  <!-- 10 × character-card -->
</section>
```
モバイル620px以下では1列に折れる。

## 画像パス
`assets/characters/<id>/mini.png` — キャラクターのバストアップ立ち絵
