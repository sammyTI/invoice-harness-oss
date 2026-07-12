// snapshot.sql を Worker が import できる ESM モジュール（snapshot.mjs）へ変換するスクリプト。
//
// Worker 側にビルドステップを持ち込まないための前処理。
// snapshot.sql の全文をテンプレートリテラル文字列として export default する
// snapshot.mjs を生成する。バッククォート・${...}・バックスラッシュを
// テンプレートリテラルを壊さないようエスケープする。
//
// 使い方（リポジトリルートから）:
//   node tools/demo-reset/build-snapshot.mjs
//
// スナップショットを更新したいとき（デモDBの現状を新しいゴールデンに）:
//   wrangler d1 export invoice_harness --remote --output tools/demo-reset/snapshot.sql
//   node tools/demo-reset/build-snapshot.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const srcPath = join(here, "snapshot.sql");
const outPath = join(here, "snapshot.mjs");

const sql = readFileSync(srcPath, "utf8");

// テンプレートリテラルを壊す3文字をエスケープ:
//   \  -> \\   （先に処理しないと後続のエスケープを二重化してしまう）
//   `  -> \`
//   ${ -> \${  （${ のみ。$ 単体はテンプレートリテラル内で無害なので触らない）
const escaped = sql
  .replace(/\\/g, "\\\\")
  .replace(/`/g, "\\`")
  .replace(/\$\{/g, "\\${");

const header =
  "// 自動生成ファイル。手で編集しない。\n" +
  "// 生成元: tools/demo-reset/snapshot.sql\n" +
  "// 再生成: node tools/demo-reset/build-snapshot.mjs\n";

const out = header + "export default `" + escaped + "`;\n";

writeFileSync(outPath, out, "utf8");

console.log(`snapshot.mjs を生成しました (${out.length} bytes, 元SQL ${sql.length} bytes)`);
