# 集合知と順位集約：競馬予想への応用

## 1. Wisdom of Crowds（Surowiecki）— 集合知の基礎理論

### 1.1 4つの成立条件

集合知（群衆の知恵）が機能するためには、James Surowiecki が提唱する4つの必須条件がある：

#### (1) 多様性（Diversity of Opinion）
- 各個人が独自の情報を持つこと
- 認知的多様性（sociological より cognitive の多様性が重要）
- グループが単一個人では考えつかない広い範囲の解決策を探索可能にする

#### (2) 独立性（Independence）
- 個人の意見が他者の意見に影響されないこと
- 各個人の判断誤差が無相関になり、相互キャンセル効果が生じる
- **herding（同調行動）の排除が生存条件**

#### (3) 分散性（Decentralization）
- 個人が専門化し、局所知識を活用可能な構造
- 中央集中的な指示の代わりに分散意思決定を可能にする

#### (4) 集約メカニズム（Aggregation）
- 個別判断を集団的決定に統合する仕組みが必要
- 単なる「聞く」ではなく、「集約する」仕組みが必須

### 1.2 競馬予想への適用

**多様性**：複数の予想モデル（血統分析、タイム分析、騎手クラス、馬場適性など）による独立予測  
**独立性**：各モデルが他の予測結果を見ずに出力を決定  
**分散性**：複数の予想家・AIが地理的・組織的に独立  
**集約**：確率分布の統合メカニズム（後述）

---

## 2. Diversity Prediction Theorem（Scott Page）— 多様性と群衆誤差

### 2.1 理論式

**E = M - D**

- **E**：群衆の集団誤差（squared error）
- **M**：各個人の平均誤差
- **D**：予測の多様性（predictive diversity）

### 2.2 直感的解釈

群衆の二乗誤差 ＝ **個人誤差の平均** − **多様性ボーナス**

多様性が大きいほど、群衆誤差は小さくなる。この定理は「群衆は個人より平均的に精度が高い」という wisdom of crowds の数学的根拠。

**重要な限定**：
- 多様性と個人誤差は独立変数ではない（実装上の課題）
- 特定の相関条件下でのみ定理が成立
- 無理に多様性を増やすと全体精度が低下する可能性がある

### 2.3 競馬予想への応用

着順予測の確率分布において：
- **M**：各モデルの平均ログロス（log loss）
- **D**：モデル予測の確率スプレッド（分散度）
- 多様なモデル構成により、理論的には集団誤差が個人より低下

ただし、過度な多様性追求は「予測能力のない予想機を含める」ことになり、逆効果。信頼度重み付けが重要。

---

## 3. 順位集約手法（Ranking Aggregation）

### 3.1 平均順位法（Average Rank / Borda 風単純平均）

**方法**：各モデルの着順予測を平均する

```
rank_agg = mean(rank_1, rank_2, ..., rank_n)
```

**特徴**：
- シンプルで直感的
- 外れ値に弱い
- 競馬では「複数モデルの平均着位が低いほど上位」

**複馬予想への適用**：  
複数モデルの予測着位を単純平均し、スコア高い順に単勝・複勝・三連複候補を絞り込む

---

### 3.2 Borda Count（伝統的投票集約法）

**方法**：候補者（競馬では馬）の位置に応じてスコアを割当

n 頭のとき：
- 1位 → n 点
- 2位 → n-1 点
- ⋮
- n位 → 1 点

各モデルでスコアを計算し、合計点で最終順位を決定。

**特徴**：
- 平均順位法と類似だが、スコア体系が明示的
- 上位層への重み付けが容易（例：1位の重みを大きくする変形）
- 投票理論として理論的背景がある

**競馬への応用**：  
複勝圏（上位3頭）を厳密に競い合う場面では Borda の重み付け変形が有効。

---

### 3.3 Kemeny-Young 法（理論的最適）

**方法**：Kendall-tau 距離を最小化する順位を探索

入力順位列群から、全順位のペアワイズ比較行列を作成し、合計スコアが最大の順位を「コンセンサス順位」として選定。

```
ConsensusRank = argmax Σ(pairwise preference agreement)
```

**特徴**：
- 理論的には Condorcet の最大尤度推定量
- **計算量が NP-hard**（候補が多いと実用困難）
- ランキングの最適性を保証（Arrow の投票パラドックスの数学的回避）

**実装上の課題**：  
- 競馬では18頭以上の出走があり、全ペアワイズ組合せは膨大
- 近似アルゴリズムまたは部分的適用が現実的

**競馬への応用**：  
上位8頭程度の有力馬グループに限定適用し、その内部順位を Kemeny 最適化する（精密な三連複・馬連構築）

---

### 3.4 Markov Chain ベース（PageRank 風）

**方法**：ランキング対象を Markov chain の状態とし、入力順位をもとに遷移確率行列を構築。定常分布（stationary distribution）の確率が最終順位。

```
P(i → j) = fraction of input rankings where i beats j
stationary_dist = limit as t → ∞ of P^t
```

**特徴**：
- 入力順位の「相対的な強さ」を自動で学習
- 出力が確率分布（スムーズ）
- グラフベース（ペアワイズ比較）なので scalable

**競馬への応用**：  
各馬が他馬に「勝つ確率」を複数モデル間で集約し、定常分布を最終予測確率に変換。確率分布のままなので、複式馬券の購買判定に直結。

---

### 3.5 Probability Pooling（確率統合）

順位ではなく、**確率分布そのものを統合**する方法。

#### (A) Linear Pooling（線形プーリング）

```
P_agg(outcome) = Σ w_i * P_i(outcome)
```

各モデルの確率を重み付き平均。

**特徴**：
- 計算が高速
- 民主的（全モデルが影響）
- **限界**：多峰分布になりやすい

#### (B) Logarithmic Pooling（対数プーリング）

```
P_agg(outcome) ∝ ∏ P_i(outcome)^{w_i}
```

確率の幾何平均。

**特徴**：
- 低確率イベントを重く見る（logarithmic penalty）
- **Veto effect**：任意のモデルが 0 確率を割り当てると、集約結果も 0 になる
- linear pooling より一般的に精度が高い（実験結果）

**競馬への応用**：  
着順の確率分布を複数モデル間で統合。対数プーリングは「1頭が絶望的に見える場合は、集約後も絶望的」という現実的な性質を保持。

---

## 4. Herding（同調行動）の問題と独立性保証

### 4.1 Herding とは

- **定義**：ユーザーが過去の集団的意見・人気に引っ張られて、独立的な判断を失う現象
- **競馬での例**：人気馬が人気であるという理由だけで支持が増える（自己充実的予言）
- **群衆の知恵の要件を破壊**：独立性喪失 → エラーの相関化 → 集団誤差拡大

### 4.2 Herding 検出と対策

#### (1) 情報遮断
各モデルの学習・予測に先立ち、他モデルの出力を一切見せない。

#### (2) 独立性の強制
- 異なるデータソース（血統DB、タイム DB、騎手統計など）から各モデルを構成
- 学習期間を時系列で分割（モデルAは2024年、モデルBは2025年など）

#### (3) Extremizing（予測の尖鋭化）
- 集約後の確率分布を「尖らせる」ことで、herding によって平坦化された予測を復元
- アンカリング効果を逆利用（群衆を低値と高値に分割し、両グループの平均を取る）

#### (4) Anti-Herding 設計
- 確率が同じ複数馬には異なる予測モデルの組み合わせを割当
- 市場人気とモデル予測が乖離している場合は「アルファ」と判定

### 4.3 競馬予想への応用

**宝塚記念対策**：
- 人気馬の独立予測を重視する
- 複数レースの過去 herding パターンを分析し、市場が陥りやすいバイアスを検出
- オッズと予測確率の乖離を収益源にする

---

## 5. 重み付け集約：信頼度の役割

### 5.1 等重み vs 信頼度重み付け

#### 等重み（無条件的民主主義）
```
P_agg = mean(P_1, P_2, ..., P_n)
```
すべてのモデルを平等に扱う。

#### 信頼度重み付け
```
P_agg = Σ w_i * P_i，  ただし w_i = accuracy_i
```
過去の精度に基づいてモデルの寄与度を調整。

### 5.2 重み付けの方法論

#### (A) 静的重み（Historical Performance Based）
- 過去 N レースでの的中率、Brier score に基づいて w_i を固定
- 簡便だが、時間変化に遅れる

#### (B) 動的重み（Temporal Weighting）
- 最近のパフォーマンスを重視（指数平滑化）
- 高度なモデルの苦手領域を学習時に重み減少
- rolling window で最新 20 レース の精度を反映

#### (C) 信号検出重み（Confidence Calibration）
- モデルが「確信している予測」ほど重みを大きくする
- 確率分布の「熱さ」を指標に

### 5.3 重み付けの理論的背景

**Diversity Prediction Theorem との矛盾**？
- 定理上は「多様性」が重要 → 全モデルを平等に
- 実装上は「精度の低いモデルは雑音」 → 重み付けで無視

**解決**：
- **高精度な多様性**が最適：精度は高いが、予測の仕方が異なるモデル群
- 低精度モデルは「多様性」ではなく「ノイズ」なので、除外または大幅減衰

### 5.4 競馬への応用

**3段階モデル信頼度構築**：
1. **予備段階**：過去 1 年の的中率で初期重み w_0 を決定
2. **適応段階**：毎週のレース後 rolling update（最新 20 レース で Brier score 計算）
3. **調整段階**：G1 レースでは人気馬との誤差パターン学習で動的重み付け

---

## 6. 予想精度の評価指標

### 6.1 Brier Score

```
BS = (1/N) Σ (y_i - p_i)^2
```

- **y_i**：実現値（1 or 0）
- **p_i**：予測確率
- **範囲**：0（完璧）～ 1（最悪）
- **分解**：信頼性（calibration）+ 解像度（resolution）+ 不確実性

**特徴**：
- 誤差を均等に扱う（距離を区別しない）
- 着順が「1位」「5位」の違いを捉えられない

---

### 6.2 Log Loss（Ignorance Score）

```
LogLoss = -(1/N) Σ log(p_i)  [where i = actual outcome]
```

- **p_i**：実現した結果への予測確率
- **範囲**：0（完璧）～ ∞（確実にハズレ）
- **性質**：間違った確信に極めて厳しい（p=0.01 でハズレなら LL → ∞）

**特徴**：
- 情報理論的（驚き度を定量化）
- log pooling との理論的整合性が高い

**競馬との相性**：
- 単一馬の単勝予測 には log loss が最適
- 過度な確信への ペナルティ が有効

---

### 6.3 Ranked Probability Score（RPS）

```
RPS = Σ_{k=1}^{K} (CDF_pred(k) - CDF_actual(k))^2
```

- **CDF**：累積分布関数
- 予測クラスと実現クラスの「距離」を反映
- **K**=2 のとき Brier score に等しい

**特徴**：
- **順序付きクラス**（1位、2位、3位…）に最適
- 「5位と6位」の誤りは「1位と6位」より軽く評価
- 複馬・複勝予想に向いている

**競馬との相性**：
- **複勝/馬連**（着順が複数）→ RPS
- **単勝**（1着のみ）→ Log Loss
- **混合予想**→ RPS で統一

---

### 6.4 評価指標の使い分け

| 指標 | 着目点 | 競馬応用 |
|------|--------|---------|
| **Brier Score** | 確率キャリブレーション | 全体的な確率精度チェック |
| **Log Loss** | 間違った確信へのペナルティ | 単勝・1着確率重視 |
| **RPS** | 着順「距離」の重視 | 複馬・複勝・馬連 |

複数指標を併用し、多角的に精度評価する。

---

## 7. 競馬予想への統合戦略

### 7.1 集約パイプライン

```
[複数モデル] 
  ↓ (独立予測：herding 遮断)
[確率分布を生成]
  ↓ (Probability Pooling: log pooling 推奨)
[集約確率分布]
  ↓ (Extremizing: herding 復元)
[最終確率]
  ↓ (Kelly criterion / 機会損失ベース购入判定)
[馬券購買決定]
```

### 7.2 多様性の具体的実装

1. **血統派モデル**：血統DB から相関度を計算
2. **タイム派モデル**：前走タイムから成長率推定
3. **騎手・調教師派**：クラス分析で成績統計
4. **人気逆張り派**：オッズ乖離を特徴として学習
5. **馬場適性派**：不良馬場での走法パターン認識

**要件**：各モデルは別々のデータソース・学習パラメータで独立構成

### 7.3 信頼度管理

- **G1 重賞**：安定的な予想モデルへ重み増加
- **芝・ダート・距離別**：過去パフォーマンス で条件適応
- **新馬・海外馬**：不確実性が高いため、信頼度減衰 or 保留

### 7.4 目標：2026 年宝塚記念での検証

宝塚記念は日本競馬の最高レース級：
- 出走馬の多様性（海外遠征組、短距離馬、長距離馬の混在）
- 人気馬への集中（herding リスク）
- 予想の難しさ（= 集合知の活躍余地）

**成功指標**：
- 3着内的中率 > 市場平均（≒ 50% 程度）
- Brier score, RPS で市場コンセンサス比 > 1.2 倍精度向上
- 複複での回収率 > 100%（期待値ベース）

---

## 参考文献・ソース

- [The Wisdom of Crowds - Wikipedia](https://en.wikipedia.org/wiki/The_Wisdom_of_Crowds)
- [Diversity Prediction Theorem – Best Mental Models](https://bestmentalmodels.com/2018/09/24/diversity-prediction-theorem/)
- [Borda count - Wikipedia](https://en.wikipedia.org/wiki/Borda_count)
- [Kemeny-Young Optimal Rank Aggregation in Python](https://vene.ro/blog/kemeny-young-optimal-rank-aggregation-in-python.html)
- [Extremizing Judgements Produces More Inaccurate Individuals but Wiser Crowds](https://escholarship.org/uc/item/7dq0095f)
- [Quantifying herding effects in crowd wisdom](https://www.researchgate.net/publication/266660464_Quantifying_herding_effects_in_crowd_wisdom)
- [Markov Chains and Ranking Problems in Web Search - Springer](https://link.springer.com/rwe/10.1007/978-1-4471-5102-9_135-1)
- [Better Metrics for Football Forecasts: RPS](https://pena.lt/y/2025/05/01/better-metrics-for-football-forecasts-moving-beyond-the-ranked-probability-score/)
- [Choosing the weights for logarithmic pooling](https://www.academia.edu/37286822/Choosing_the_weights_for_the_logarithmic_pooling_of_probability_distributions)
- [A Weighted Rank aggregation approach towards crowd opinion analysis](https://www.sciencedirect.com/science/article/abs/pii/S095070511830056X)
