import type { RequestHandler } from "./$types";
import { redirect } from "@sveltejs/kit";
import { canViewFinance, canViewPayroll, getDB, journalEntries, type JournalEntry } from "$lib/server/db";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";
import { csvResponse } from "$lib/server/csv";
import { GENERIC_JOURNAL_HEADER, genericJournalRows, yayoiRows } from "$lib/server/journal-format";

// 仕訳CSVのダウンロード。/reports/journal のフォームから GET で叩く。
// 形式=汎用（freee/MF向け8列）または弥生（25列・ヘッダなし）。対象イベントはクエリで指定。

export const GET: RequestHandler = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  if (!(await canViewFinance(db, locals.user))) throw redirect(303, "/");

  const allowed = await allowedIssuerIds(db, locals.user);

  // 期間（年月）。既定は今月。YYYY-MM を YYYY-MM-01 / YYYY-MM-31 に展開する。
  const fromYm = /^\d{4}-\d{2}$/.test(url.searchParams.get("from") ?? "") ? url.searchParams.get("from")! : "";
  const toYm = /^\d{4}-\d{2}$/.test(url.searchParams.get("to") ?? "") ? url.searchParams.get("to")! : "";
  const from = fromYm ? `${fromYm}-01` : "0000-01-01";
  const to = toYm ? `${toYm}-31` : "9999-12-31";

  const flag = (k: string) => url.searchParams.get(k) !== "0";
  const include = { sales: flag("sales"), receipts: flag("receipts"), purchases: flag("purchases"), expenses: flag("expenses") };

  const issParam = url.searchParams.get("iss") ?? "";
  const issuerId = issParam && canAccessIssuer(allowed, issParam) ? issParam : "";

  // 給与系（confidential）経費は canViewPayroll が無ければ除外する。
  const mayViewPayroll = await canViewPayroll(db, locals.user);

  let entries: JournalEntry[] = [];
  if (issuerId) {
    entries = await journalEntries(db, { from, to, issuerId, include, includeConfidential: mayViewPayroll });
  } else if (allowed && allowed.length) {
    for (const iid of allowed) {
      entries.push(...(await journalEntries(db, { from, to, issuerId: iid, include, includeConfidential: mayViewPayroll })));
    }
    entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  } else {
    entries = await journalEntries(db, { from, to, include, includeConfidential: mayViewPayroll });
  }

  const format = url.searchParams.get("format") === "yayoi" ? "yayoi" : "generic";
  if (format === "yayoi") {
    // 弥生形式は独自の25列・ヘッダなし。csvResponse を使わず従来と同じ組み立て（BOM+CRLF）。
    const body = "﻿" + yayoiRows(entries).join("\r\n") + "\r\n";
    return new Response(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="yayoi-journal.csv"`,
      },
    });
  }
  // 汎用仕訳CSV（列の割り当て機能つきインポート向け）。
  return csvResponse("journal.csv", GENERIC_JOURNAL_HEADER, genericJournalRows(entries));
};
