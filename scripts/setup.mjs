#!/usr/bin/env node
/**
 * invoice-harness-oss セットアップ（Cloudflare 無料枠に一発デプロイ）
 *
 * 実行: pnpm setup
 *
 * やること:
 *   1) Cloudflare ログイン確認
 *   2) D1 データベース作成 → database_id を wrangler.toml に自動書き込み
 *   3) R2 バケット作成（社印・ロゴ保存用）
 *   4) ビルド
 *   5) D1 マイグレーション適用（本番）
 *   6) Pages（ダッシュボード）と Worker（催促Cron）をデプロイ
 *   7) 公開URLを表示 → /setup でオーナーを作成
 *
 * 途中で失敗しても、もう一度 pnpm setup を実行すれば続きから進められます
 * （作成済みの D1/R2 は「already exists」で無害にスキップされます）。
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DB_NAME = "invoice_harness";
const R2_BUCKET = "invoice-harness-assets";

const log = (m) => console.log(`\n[36m▸ ${m}[0m`);
const warn = (m) => console.log(`[33m${m}[0m`);

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
}
function capture(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["inherit", "pipe", "pipe"], ...opts });
}
const wr = (args, o) => `pnpm --filter @invoice-harness/web exec wrangler ${args}`;

// 1) ログイン確認
log("Cloudflare ログインを確認します");
try {
  capture(wr("whoami"));
} catch {
  warn("未ログインです。ブラウザで Cloudflare にログインしてください。");
  run(wr("login"));
}

// 2) D1 作成 + database_id を wrangler.toml に書き込み
log(`D1 データベース「${DB_NAME}」を作成します`);
let dbId = "";
try {
  const out = capture(wr(`d1 create ${DB_NAME}`));
  dbId = (out.match(/database_id\s*=\s*"([0-9a-f-]+)"/i) || [])[1] || "";
  console.log(out);
} catch (e) {
  const out = String(e.stdout || "") + String(e.stderr || "");
  if (/already exists/i.test(out)) {
    warn("D1 は既に存在します。既存の ID を取得します。");
    const list = capture(wr("d1 list --json"));
    try {
      const found = JSON.parse(list).find((d) => d.name === DB_NAME);
      dbId = found?.uuid || found?.database_id || "";
    } catch {}
  } else {
    console.error(out);
    throw e;
  }
}
if (!dbId) {
  warn("database_id を自動取得できませんでした。`wrangler d1 list` で ID を確認し、apps/web/wrangler.toml と apps/worker/wrangler.toml の database_id を手動で設定してください。");
} else {
  for (const f of ["apps/web/wrangler.toml", "apps/worker/wrangler.toml"]) {
    const p = resolve(root, f);
    const t = readFileSync(p, "utf8").replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${dbId}"`);
    writeFileSync(p, t);
    console.log(`  ✓ ${f} に database_id を設定`);
  }
}

// 3) R2 バケット作成
log(`R2 バケット「${R2_BUCKET}」を作成します`);
try {
  run(wr(`r2 bucket create ${R2_BUCKET}`));
} catch {
  warn("R2 バケットは既に存在します（スキップ）。");
}

// 4) ビルド
log("ビルドします");
run("pnpm build");

// 5) マイグレーション（本番）
log("本番 D1 にマイグレーションを適用します");
run(wr(`d1 migrations apply ${DB_NAME} --remote`));

// 6) デプロイ
log("ダッシュボード（Pages）をデプロイします");
run("pnpm --filter @invoice-harness/web exec wrangler pages deploy .svelte-kit/cloudflare --project-name invoice-harness");

log("催促ワーカー（Cron）をデプロイします");
try {
  run("pnpm --filter @invoice-harness/worker exec wrangler deploy");
} catch {
  warn("Worker のデプロイに失敗しました（催促メールが不要なら無視して構いません）。");
}

// 7) 完了
log("セットアップ完了！");
console.log(`
次の手順:
  1. 表示された Pages の URL（https://invoice-harness.pages.dev など）を開く
  2. /setup でオーナー（管理者）アカウントを作成
  3. 設定 ▸ 自社情報 で会社情報・振込先を登録

任意:
  - 催促メールを使う場合: apps/worker で
      wrangler secret put RESEND_API_KEY
      wrangler secret put MAIL_FROM
    を設定し、apps/worker/wrangler.toml の APP_URL を自分のURLに変更して再デプロイ
  - AI（Claude等）から操作: 設定 ▸ API/AI連携 でトークン発行 → packages/mcp-server を参照
`);
