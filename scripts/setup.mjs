#!/usr/bin/env node
/**
 * invoice-harness セットアップ（対話式・Cloudflare 無料枠へデプロイ）
 * 実行: node scripts/setup.mjs   または   pnpm run setup
 *
 * プロジェクト名を選び、Cloudflare にログインして、D1 / R2 作成 →
 * マイグレーション → Pages / Worker デプロイまで対話で進めます。
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const C = { cyan: "\x1b[36m", yellow: "\x1b[33m", green: "\x1b[32m", dim: "\x1b[2m", bold: "\x1b[1m", reset: "\x1b[0m" };
const step = (m) => console.log(`\n${C.cyan}${C.bold}▸ ${m}${C.reset}`);
const ok = (m) => console.log(`  ${C.green}✓${C.reset} ${m}`);
const warn = (m) => console.log(`  ${C.yellow}! ${m}${C.reset}`);

const wr = (args) => `pnpm --filter @invoice-harness/web exec wrangler ${args}`;
const run = (cmd, opts = {}) => execSync(cmd, { cwd: root, stdio: "inherit", ...opts });
const capture = (cmd, opts = {}) => execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["inherit", "pipe", "pipe"], ...opts });

function patchToml(file, replacements) {
  const p = resolve(root, file);
  let t = readFileSync(p, "utf8");
  for (const [re, val] of replacements) t = t.replace(re, val);
  writeFileSync(p, t);
}

console.log(`\n${C.bold}────────────────────────────────`);
console.log("  invoice-harness セットアップ");
console.log(`────────────────────────────────${C.reset}`);
console.log(`${C.dim}作られる物はすべて ${C.reset}${C.bold}あなたのCloudflareアカウント内${C.reset}${C.dim}・無料枠で動き、いつでも削除できます。`);
console.log(`下で選んで確認するまで、まだ何も作りません。${C.reset}\n`);

const rl = createInterface({ input: process.stdin, output: process.stdout });

// ---- 対話: モード選択（怖い人はローカルから） ----
console.log(`どう進めますか？`);
console.log(`  ${C.bold}1${C.reset}) Cloudflare に公開する（本番として使う・無料）`);
console.log(`  ${C.bold}2${C.reset}) まずローカルで試す（クラウドには一切上げない）`);
const mode = (await rl.question(`選択 ${C.dim}[1]${C.reset}: `)).trim() || "1";

if (mode === "2") {
  rl.close();
  step("ローカル用データベースを準備します");
  run("pnpm db:migrate:local");
  console.log(`\n${C.green}${C.bold}✓ ローカル準備完了！クラウドには何も上げていません。${C.reset}\n`);
  console.log(`起動するには:`);
  console.log(`  ${C.bold}pnpm dev${C.reset}   → ブラウザで ${C.bold}http://localhost:5179${C.reset}\n`);
  console.log(`${C.dim}任意: サンプルデータ投入 = pnpm db:seed:local`);
  console.log(`本番公開したくなったら、もう一度 pnpm run setup で「1」を選んでください。${C.reset}\n`);
  process.exit(0);
}

// ---- 対話: プロジェクト名（既定はランダム。<名前>.pages.dev は世界で唯一なので衝突回避） ----
const rand = Math.floor(1000 + Math.random() * 9000);
const defName = `invoice-harness-${rand}`;
console.log(`\n${C.dim}※ 公開URLは「<プロジェクト名>.pages.dev」で世界共通の唯一名です。`);
console.log(`   「invoice」等の短い名前は他の人と被って失敗するため、既定はランダム名にしています。${C.reset}`);
let raw = (await rl.question(`プロジェクト名 ${C.dim}[${defName}]${C.reset}: `)).trim();
let name = (raw || defName).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || defName;

const pagesProject = name;
const workerName = `${name}-worker`;
const r2Bucket = `${name}-assets`;
const d1Name = name.replace(/-/g, "_");

console.log(`\n以下を ${C.bold}あなたのCFアカウント内${C.reset} に作成します（無料・後で削除可）:`);
console.log(`  ${C.dim}Pages(画面)${C.reset}   ${pagesProject}  → https://${pagesProject}.pages.dev`);
console.log(`  ${C.dim}D1(DB)${C.reset}        ${d1Name}`);
console.log(`  ${C.dim}R2(画像)${C.reset}      ${r2Bucket}`);
console.log(`  ${C.dim}Worker(催促)${C.reset}  ${workerName}`);
const yn = (await rl.question(`\nこの内容で公開しますか？ ${C.dim}[Y/n]${C.reset}: `)).trim().toLowerCase();
rl.close();
if (yn === "n" || yn === "no") {
  console.log("中止しました。何も作成していません。");
  process.exit(0);
}

// ---- wrangler.toml を反映 ----
step("設定ファイルを反映します");
patchToml("apps/web/wrangler.toml", [
  [/^name\s*=\s*".*"/m, `name = "${pagesProject}"`],
  [/database_name\s*=\s*"[^"]*"/, `database_name = "${d1Name}"`],
  [/bucket_name\s*=\s*"[^"]*"/, `bucket_name = "${r2Bucket}"`],
]);
patchToml("apps/worker/wrangler.toml", [
  [/^name\s*=\s*".*"/m, `name = "${workerName}"`],
  [/database_name\s*=\s*"[^"]*"/, `database_name = "${d1Name}"`],
]);
ok("wrangler.toml を更新");

// ---- Cloudflare ログイン ----
step("Cloudflare ログインを確認します");
let who = "";
try {
  who = capture(wr("whoami"));
} catch {
  warn("未ログインです。ブラウザで Cloudflare にログインしてください…");
  run(wr("login"));
}

// ---- D1 作成 ----
step(`D1 データベース「${d1Name}」を用意します`);
let dbId = "";
try {
  const out = capture(wr(`d1 create ${d1Name}`));
  dbId = (out.match(/database_id\s*=\s*"([0-9a-f-]+)"/i) || [])[1] || "";
} catch (e) {
  const out = String(e.stdout || "") + String(e.stderr || "");
  if (/already exists/i.test(out)) {
    warn("既存の D1 を再利用します。");
    try {
      dbId = (JSON.parse(capture(wr("d1 list --json"))).find((d) => d.name === d1Name) || {}).uuid || "";
    } catch {}
  } else {
    console.error(out);
    process.exit(1);
  }
}
if (!dbId) {
  warn("database_id を自動取得できませんでした。`pnpm --filter @invoice-harness/web exec wrangler d1 list` で確認し、wrangler.toml に手動設定してください。");
} else {
  patchToml("apps/web/wrangler.toml", [[/database_id\s*=\s*"[^"]*"/, `database_id = "${dbId}"`]]);
  patchToml("apps/worker/wrangler.toml", [[/database_id\s*=\s*"[^"]*"/, `database_id = "${dbId}"`]]);
  ok(`database_id を設定 (${dbId.slice(0, 8)}…)`);
}

// ---- R2 作成 ----
step(`R2 バケット「${r2Bucket}」を用意します`);
try {
  capture(wr(`r2 bucket create ${r2Bucket}`));
  ok("作成しました");
} catch {
  warn("既存のバケットを再利用します。");
}

// ---- ビルド ----
step("ビルドします（少し時間がかかります）");
run("pnpm build");
ok("ビルド完了");

// ---- マイグレーション ----
step("本番 D1 にマイグレーションを適用します");
run(wr(`d1 migrations apply ${d1Name} --remote`));
ok("適用完了");

// ---- Pages デプロイ ----
step("ダッシュボード（Pages）をデプロイします");
let url = `https://${pagesProject}.pages.dev`;
try {
  const out = capture(`pnpm --filter @invoice-harness/web exec wrangler pages deploy .svelte-kit/cloudflare --project-name ${pagesProject}`);
  console.log(out);
  const m = out.match(/https:\/\/[a-z0-9-]+\.pages\.dev/i);
  if (m) console.log("");
} catch (e) {
  // 初回はプロジェクト未作成で対話が要る場合がある
  console.error(String(e.stdout || "") + String(e.stderr || ""));
  warn("Pages デプロイで停止しました。もう一度 `pnpm run setup` を実行すると続きから進みます。");
  process.exit(1);
}
ok(`公開URL: ${url}`);

// ---- Worker デプロイ ----
step("催促ワーカー（Cron）をデプロイします");
patchToml("apps/worker/wrangler.toml", [[/APP_URL\s*=\s*"[^"]*"/, `APP_URL = "${url}"`]]);
try {
  run("pnpm --filter @invoice-harness/worker exec wrangler deploy");
  ok("デプロイ完了");
} catch {
  warn("Worker のデプロイをスキップしました（催促メールが不要なら問題ありません）。");
}

// ---- 完了 ----
console.log(`\n${C.green}${C.bold}✓ セットアップ完了！${C.reset}\n`);
console.log(`次の手順:`);
console.log(`  1. ブラウザで ${C.bold}${url}/setup${C.reset} を開く`);
console.log(`  2. オーナー（管理者）アカウントを作成`);
console.log(`  3. 設定 ▸ 自社情報 で会社情報・振込先を登録 → 請求書作成へ\n`);
console.log(`${C.dim}任意: 催促メール(Resend)・AI操作(MCP)は README を参照。${C.reset}\n`);
