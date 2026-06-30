#!/usr/bin/env node
/**
 * create-invoice-harness
 * `npx create-invoice-harness [dir]` で invoice-harness を取得し、
 * Cloudflare 無料枠へ一発セットアップ＆デプロイする。
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const REPO = "https://github.com/sammyTI/invoice-harness-oss.git";
const dir = process.argv[2] || "invoice-harness";
const target = resolve(process.cwd(), dir);

function has(cmd) {
  try {
    execSync(process.platform === "win32" ? `where ${cmd}` : `command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", ...opts });
}

console.log("\n────────────────────────────────");
console.log("  invoice-harness セットアップ");
console.log("  請求書ツールを Cloudflare 無料枠へ");
console.log("────────────────────────────────\n");

if (!has("git")) {
  console.error("✗ git が見つかりません。git をインストールしてください。");
  process.exit(1);
}
if (!has("pnpm")) {
  console.error("✗ pnpm が見つかりません。`npm i -g pnpm` を実行してください。");
  process.exit(1);
}
if (existsSync(target)) {
  console.error(`✗ フォルダ「${dir}」は既に存在します。別名を指定してください:\n    npx create-invoice-harness <フォルダ名>`);
  process.exit(1);
}

console.log(`▸ リポジトリを取得します → ${dir}/`);
run(`git clone --depth 1 ${REPO} "${target}"`);

console.log("\n▸ 依存をインストールします");
run("pnpm install", { cwd: target });

console.log("\n▸ セットアップを開始します（対話式）\n");
try {
  run("node scripts/setup.mjs", { cwd: target });
} catch {
  console.error(`\n✗ セットアップ途中で停止しました。\n  cd ${dir} && pnpm run setup  で続きから再実行できます（README の手動手順も参照）。`);
  process.exit(1);
}
