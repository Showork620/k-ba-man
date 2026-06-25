# Race history data contract

`race-history.v1` は、サイト上で「各キャラの各レース予想」と「確定結果・採点」を同じ形式で読むための静的スナップショットです。

- `race-history.v1.json`: データ本体。将来DB/APIへ移す対象。
- `race-history.v1.js`: `file://` で開くプロトタイプでも動かすための同内容JSラッパー。
- `live-race.v1.json`: `#/live` の現在段階を決める制御データ。
- `live-race.v1.js`: `file://` で開くプロトタイプでも動かすための同内容JSラッパー。
- `race-history.schema.json`: `race-history.v1` のJSON Schema。
- `live-race.schema.json`: `live-race.v1` のJSON Schema。
- `../api/race-history-api.js`: 表示側が使う取得API。今は静的コピーを返し、DB化時はこの取得元だけ差し替える。
- `../api/live-race-api.js`: ライブページが使う取得API。今は静的コピーを返す。

## Top level

```json
{
  "schema_version": "race-history.v1",
  "generated_at": "2026-06-21T00:00:00+09:00",
  "source": { "kind": "site-static-copy" },
  "races": []
}
```

## Race

各 `races[]` は1レースを表します。

- `race_id`: netkeiba/JRA系の12桁ID。
- `horse_list` / `horses`: 馬番と馬名。馬番はレースごとに意味が変わるため、必ずレース内で解決する。
- `result`: 確定結果。`winner`、`place3`、元データ互換の `payouts`、表示/API向けに正規化した `payout_list` を含む。
- `betting`: サイト表示用の投資・払戻サマリー、実購入/最終買い目の `tickets`、的中買い目の `hits`、勝ち筋説明の `how_won`。
- `collective`: 10人集約の印、順位、Brier。
- `experts[]`: 各 `jinba-*` 予想専門家の予想詳細と採点。

## Expert record

`experts[]` は表示とDB化の境目になる中心レコードです。

- `prediction`: レース前の予想正本。`predicted_ranking`、`win_prob`、`place_prob`、`marks`、`rationale`、`data_used`、`warnings`。
- `score`: レース後採点。`p_winner`、`win_brier`、`win_logloss`、`honmei_status`、`marks_place3_coverage`。

予想と採点を分けているので、将来DB化するときは `predictions` と `race_scores` を別テーブルにしても、このAPIレスポンス形へ再構成できます。

## Live race

`live-race.v1` はレース本体を重複保持せず、現在の公開状態だけを持ちます。

```json
{
  "schema_version": "live-race.v1",
  "active_phase": "result",
  "current_race_id": "202609030611",
  "phases": []
}
```

- `current_race_id`: `race-history.v1.races[].race_id` を参照する。
- `active_phase`: `announce` / `predictions` / `result` のいずれか。
- `phases[].short_title`: 状態フローに出す短い名称。
- `phases[].next_phase`: 次の状態。`announce -> predictions -> result -> announce` のサイクルにする。
- `phases[].next_timing`: いつ次の状態へ進むかを人間向けに表示する文言。
- `#/live`: `active_phase` を表示する。
- `#/live/<phase>`: 段階別の直リンク。公開前後の確認用にも使える。

## Betting record

`betting.tickets[]` は実際にサイトで説明する買い目単位です。宝塚記念は圧縮後の最終3,000円、しらさぎステークスは統合買い目3,800円を正としています。

- `selection`: 機械処理用の買い目表記。
- `selection_label`: サイト表示用の馬名付き表記。
- `stake_jpy`: 投資額。
- `hit`: 的中したか。
- `payout_per_100`: 100円あたり払戻。外れは `null`。
- `return_jpy`: その買い目の払戻額。

`result.payout_list[]` はJRA確定払戻を券種横断で表示しやすい配列に正規化したものです。元の `result.payouts` も互換用に残しています。
