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

// 任意: Resend（メール送付・未入金催促）。未設定でもアプリは動く。
console.log(`\n${C.dim}メール送付・催促を使う場合は Resend の APIキー（https://resend.com で無料取得）。`);
console.log(`不要なら空欄で Enter（あとから設定できます）。${C.reset}`);
const resendKey = (await rl.question(`Resend APIキー ${C.dim}[空欄=使わない]${C.reset}: `)).trim();
let mailFrom = "";
if (resendKey) {
  mailFrom = (await rl.question(`差出人 ${C.dim}[Invoice Harness <onboarding@resend.dev>]${C.reset}: `)).trim() || "Invoice Harness <onboarding@resend.dev>";
}

// 管理者（オーナー）アカウント。install 後すぐログインできるよう先に作成する。
console.log(`\n${C.dim}管理者（オーナー）アカウントを作ります。デプロイ後すぐログインできます。${C.reset}`);
let ownerEmail = (await rl.question(`管理者メール ${C.dim}[admin@example.com]${C.reset}: `)).trim() || "admin@example.com";
let ownerPw = (await rl.question(`パスワード ${C.dim}[空欄=自動生成]${C.reset}: `)).trim();

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

// ---- 管理者（オーナー）を自動作成（/setup 不要に） ----
step("管理者アカウントを作成します");
const { webcrypto } = await import("node:crypto");
const { randomBytes } = await import("node:crypto");
function genPw(n = 12) {
  const cs = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const b = randomBytes(n);
  let s = "";
  for (let i = 0; i < n; i++) s += cs[b[i] % cs.length];
  return s;
}
async function hashPw(pw) {
  const enc = new TextEncoder();
  const salt = webcrypto.getRandomValues(new Uint8Array(16));
  const key = await webcrypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await webcrypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
  return { hash: hex(bits), salt: hex(salt) };
}
let ownerCreated = false;
try {
  const out = capture(wr(`d1 execute ${d1Name} --remote --json --command "SELECT COUNT(*) AS n FROM members WHERE role='owner'"`));
  const m = out.match(/"n":\s*(\d+)/);
  const cnt = m ? Number(m[1]) : 0;
  if (cnt > 0) {
    warn("既に管理者が存在します（作成をスキップ）。");
  } else {
    if (!ownerPw) ownerPw = genPw();
    const { hash, salt } = await hashPw(ownerPw);
    const oid = "mbr_" + randomBytes(6).toString("hex");
    execSync(
      wr(`d1 execute ${d1Name} --remote --command "INSERT INTO members (id,name,email,role,created_at,password_hash,salt,status,must_change_password) VALUES ('${oid}','管理者','${ownerEmail}','owner','${new Date().toISOString()}','${hash}','${salt}','active',0)"`),
      { cwd: root, stdio: ["inherit", "pipe", "pipe"] }
    );
    ownerCreated = true;
    ok("管理者を作成しました");
  }
} catch {
  warn("管理者の自動作成に失敗（デプロイ後 /setup で作成できます）。");
}

// ---- Pages プロジェクト作成（無いと deploy が対話を要求して失敗するため先に作る） ----
step(`Pages プロジェクト「${pagesProject}」を用意します`);
try {
  capture(wr(`pages project create ${pagesProject} --production-branch main`));
  ok("作成しました");
} catch (e) {
  const out = String(e.stdout || "") + String(e.stderr || "");
  if (/already|exist/i.test(out)) warn("既存のプロジェクトを再利用します。");
  else console.log(`  ${C.dim}(${out.split("\n").find((l) => l.trim()) || "skip"})${C.reset}`);
}

// ---- Pages デプロイ ----
const url = `https://${pagesProject}.pages.dev`;
step("ダッシュボード（Pages）をデプロイします");
run(`pnpm --filter @invoice-harness/web exec wrangler pages deploy .svelte-kit/cloudflare --project-name ${pagesProject} --branch main --commit-dirty=true`);
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

// ---- Resend（メール）シークレット設定（入力された場合のみ） ----
if (resendKey) {
  step("メール送付（Resend）を設定します");
  const putPages = (n, v) => { try { execSync(`pnpm --filter @invoice-harness/web exec wrangler pages secret put ${n} --project-name ${pagesProject}`, { cwd: root, input: v, stdio: ["pipe", "inherit", "inherit"] }); return true; } catch { return false; } };
  const putWorker = (n, v) => { try { execSync(`pnpm --filter @invoice-harness/worker exec wrangler secret put ${n}`, { cwd: root, input: v, stdio: ["pipe", "inherit", "inherit"] }); return true; } catch { return false; } };
  const r1 = putPages("RESEND_API_KEY", resendKey), r2 = putPages("MAIL_FROM", mailFrom);
  const r3 = putWorker("RESEND_API_KEY", resendKey), r4 = putWorker("MAIL_FROM", mailFrom);
  if (r1 && r2 && r3 && r4) ok("メール送付・催促を有効化しました");
  else warn("一部のシークレット設定に失敗。README の「メール送付」手順で手動設定できます。");
}

// ---- AI連携（MCP）トークンを自動発行＋設定を出力 ----
step("AI連携（MCP）を準備します");
let mcpBlock = "";
try {
  execSync("pnpm --filter @invoice-harness/mcp-server build", { cwd: root, stdio: ["inherit", "pipe", "pipe"] });
  const { createHash, randomBytes } = await import("node:crypto");
  const apiToken = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(apiToken).digest("hex");
  const tokId = "tok_" + randomBytes(6).toString("hex");
  execSync(wr(`d1 execute ${d1Name} --remote --command "INSERT INTO api_tokens (id,name,token_hash,created_at) VALUES ('${tokId}','setup-mcp','${tokenHash}','${new Date().toISOString()}')"`), { cwd: root, stdio: ["inherit", "pipe", "pipe"] });
  const mcpPath = resolve(root, "packages/mcp-server/dist/index.js");
  mcpBlock =
    `${C.bold}AI（Claude）から自然言語で操作する（MCP）${C.reset}\n` +
    `  Claude Code をお使いなら、次の1行をそのまま実行（URL・トークン設定済み）:\n\n` +
    `  ${C.cyan}claude mcp add invoice-harness --env IH_API_URL=${url} --env IH_API_TOKEN=${apiToken} -- node ${mcpPath}${C.reset}\n\n` +
    `  ${C.dim}登録後は「○○社に請求書を作って」等で操作できます。トークンは 設定 ▸ API/AI連携 で失効可。${C.reset}`;
  ok("MCPトークンを発行しました（上記コマンドで登録）");
} catch {
  warn("MCPの自動準備をスキップ（後で 設定 ▸ API/AI連携 でトークン発行→README参照）");
}

// ---- 完了 ----
console.log(`\n${C.green}${C.bold}✓ セットアップ完了！${C.reset}\n`);
if (ownerCreated) {
  console.log(`${C.bold}▼ ログイン（管理者は作成済み）${C.reset}`);
  console.log(`  ${C.bold}${url}/login${C.reset}`);
  console.log(`  メール:       ${C.bold}${ownerEmail}${C.reset}`);
  console.log(`  パスワード:   ${C.bold}${ownerPw}${C.reset}`);
  console.log(`  ${C.dim}ログイン後 設定 ▸ 自社情報 で会社情報を登録（AIからも可）${C.reset}\n`);
} else {
  console.log(`${C.bold}▼ まずやること${C.reset}`);
  console.log(`  ブラウザで ${C.bold}${url}/setup${C.reset} を開く → 管理者作成 → 設定 ▸ 自社情報\n`);
}
if (resendKey) console.log(`${C.green}✓ メール送付（Resend）設定済み${C.reset}\n`);
if (mcpBlock) console.log(mcpBlock + "\n");
