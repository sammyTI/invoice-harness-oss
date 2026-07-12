# demo-reset

公開デモの D1 を毎日ゴールデンスナップショットへ戻す Cron Worker。**公開デモ環境の運用専用で、配布物ではありません。**

cron `0 19 * * *`（UTC19時 = JST朝4時）に、全テーブルを DROP して `snapshot.sql` を再構築します。

## セットアップ

1. スナップショットを ESM 化: `node tools/demo-reset/build-snapshot.mjs`（`snapshot.mjs` を生成）
2. `wrangler.toml` の `database_id` をデモDBの実IDへ差し替え（`wrangler d1 list` で確認）
3. デプロイ: `wrangler deploy`（このディレクトリで実行）
4. 手動実行口を使うなら RESET_KEY を設定: `wrangler secret put RESET_KEY`
   - 動作確認: `GET https://<worker>/run?key=<RESET_KEY>`（未設定時は 404）

## スナップショット更新

```
wrangler d1 export invoice_harness --remote --output tools/demo-reset/snapshot.sql
node tools/demo-reset/build-snapshot.mjs
wrangler deploy
```
