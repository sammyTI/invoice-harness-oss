// 公開デモDBを毎日ゴールデンスナップショットへ戻す Cron Worker 本体。
//
// - scheduled: cron（wrangler.toml の "0 19 * * *" = JST 朝4時）で自動リセット
// - fetch: GET /run?key=<RESET_KEY> で手動リセット（デプロイ直後の動作確認用）
//
// スナップショットは build-snapshot.mjs が snapshot.sql から生成する snapshot.mjs
// （export default のテンプレートリテラル文字列）を import する。ビルドステップ不要。

import SNAPSHOT_SQL from "./snapshot.mjs";

// snapshot.sql の SQL 文を1文ずつに分割する。
//
// snapshot.sql の形（wrangler d1 export の全文）:
//   - CREATE TABLE は複数行にまたがる（継続行はインデント）
//   - INSERT / CREATE INDEX / PRAGMA は各1行で必ず ";" で終わる
//   - 値の内側にセミコロンや改行が来ても、文の途中では行末が ";" にならない
// よって「行を溜め込み、trim した蓄積が ";" で終わったら1文完成」方式が安全。
// 単純な ";\n" split と違い、値内のセミコロン/改行で誤分割しない。
function splitStatements(sql) {
  const statements = [];
  let buffer = "";
  for (const line of sql.split("\n")) {
    // 行頭コメント・空行は文の区切りに影響しないが、蓄積中でなければスキップ
    if (buffer === "" && (line.trim() === "" || line.trim().startsWith("--"))) {
      continue;
    }
    buffer += (buffer === "" ? "" : "\n") + line;
    if (buffer.trimEnd().endsWith(";")) {
      const stmt = buffer.trim();
      if (stmt !== "" && stmt !== ";") statements.push(stmt);
      buffer = "";
    }
  }
  // 末尾に ";" 無しで残った分があれば拾う（通常は発生しない）
  const tail = buffer.trim();
  if (tail !== "" && tail !== ";") statements.push(tail);
  return statements;
}

// リセット本体。DROP → スナップショット再構築を実行し、結果サマリを返す。
async function resetDatabase(db) {
  const startedAt = Date.now();

  // 1. 既存テーブルを全て DROP（d1_migrations 含む。スナップショットが再作成する）。
  //    sqlite_% / _cf_% は D1 内部テーブルなので除外。
  const { results: tableRows } = await db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' " +
        "AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'"
    )
    .all();

  // 外部キー制約で DROP 順に詰まらないよう、外部キーを一時的に無効化。
  await db.prepare("PRAGMA defer_foreign_keys = TRUE").run();

  let dropped = 0;
  for (const row of tableRows) {
    // DROP は復元の前提。失敗したら投げて中断する（中途半端な再構築を避ける）。
    await db.prepare(`DROP TABLE IF EXISTS "${row.name}"`).run();
    dropped++;
  }

  // 2. スナップショットを1文ずつ順に実行（batch は配列サイズ制限があるので直列 await）。
  const statements = splitStatements(SNAPSHOT_SQL);
  let executed = 0;
  let failed = 0;
  for (const stmt of statements) {
    try {
      await db.prepare(stmt).run();
      executed++;
    } catch (err) {
      // DROP は上で完了済み。ここは復元文なので、1文失敗しても続行する方が復元力が高い。
      failed++;
      const head = stmt.slice(0, 120).replace(/\n/g, " ");
      console.error(`[demo-reset] 文の実行に失敗（続行）: ${head} ... : ${err.message}`);
    }
  }

  const elapsedMs = Date.now() - startedAt;
  const summary = {
    droppedTables: dropped,
    totalStatements: statements.length,
    executed,
    failed,
    elapsedMs,
  };
  console.log(`[demo-reset] 完了: ${JSON.stringify(summary)}`);
  return summary;
}

export default {
  // Cron トリガーによる自動リセット。
  async scheduled(_event, env, _ctx) {
    if (!env.DB) {
      console.error("[demo-reset] DB バインディングが未設定");
      return;
    }
    await resetDatabase(env.DB);
    // エラーは resetDatabase 内でログ済み。cron は失敗しても翌日再実行される。
  },

  // 手動リセット用エンドポイント（デプロイ直後の確認用）。
  // RESET_KEY 環境変数が設定されていて、?key= と一致する場合のみ実行。
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    if (url.pathname !== "/run") {
      return new Response("Not Found", { status: 404 });
    }
    // RESET_KEY 未設定なら手動実行口は無効（404）。
    if (!env.RESET_KEY) {
      return new Response("Not Found", { status: 404 });
    }
    if (url.searchParams.get("key") !== env.RESET_KEY) {
      return new Response("Forbidden", { status: 403 });
    }
    if (!env.DB) {
      return new Response("DB binding not configured", { status: 500 });
    }
    const summary = await resetDatabase(env.DB);
    return new Response(JSON.stringify(summary, null, 2) + "\n", {
      status: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  },
};
