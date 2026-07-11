import type { RequestHandler } from "./$types";
import { redirect } from "@sveltejs/kit";
import { canViewFinance, getDB, journalEntries } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";
import { yayoiRows } from "$lib/server/journal-format";

// 弥生会計 インポート形式（25列・ヘッダなし）。売上計上と入金の仕訳を出力する。
// 中身は共通の仕訳エンジン journalEntries（売上＋入金のみ）で生成し、レスポンスは従来形式を維持する。
// 勘定科目は標準的な想定（売掛金/売上高/普通預金）。必要に応じて取込側または /reports/journal の設定で調整。

export const GET: RequestHandler = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  // 経営数値の閲覧権限が無い member はホームへ戻す（仕訳CSV＝売上・入金データ）。
  if (!(await canViewFinance(db, locals.user))) throw redirect(303, "/");
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const allowed = await allowedIssuerIds(db, locals.user);

  // 会社ガード: allowed が制限ありなら各社ぶんを合算して出す（未指定=許可された全社）。
  // 期間未指定は from/to を極大範囲にして全件対象にする（従来挙動を踏襲）。
  const f = from || "0000-01-01";
  const t = to || "9999-12-31";
  const include = { sales: true, receipts: true, purchases: false, expenses: false };

  let entries;
  if (allowed && allowed.length) {
    entries = [];
    for (const iid of allowed) entries.push(...(await journalEntries(db, { from: f, to: t, issuerId: iid, include })));
    entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  } else {
    entries = await journalEntries(db, { from: f, to: t, include });
  }

  const body = "﻿" + yayoiRows(entries).join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="yayoi-journal.csv"`,
    },
  });
};
