import type { RequestHandler } from "./$types";
import { applyRounding } from "@invoice-harness/shared";
import { getDB, getSettings } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";

// 弥生会計 インポート形式（25列・ヘッダなし）。売上計上と入金の仕訳を出力。
// 勘定科目は標準的な想定（売掛金/売上高/普通預金）。必要に応じて取込側で調整してください。

function cell(v: string | number): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function row(cols: (string | number)[]): string {
  return cols.map(cell).join(",");
}

export const GET: RequestHandler = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const settings = await getSettings(db);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const allowed = await allowedIssuerIds(db, locals.user);

  const cond: string[] = ["d.type='invoice'", "d.status != 'canceled'"];
  const binds: string[] = [];
  let i = 1;
  if (from) { cond.push(`d.issue_date >= ?${i++}`); binds.push(from); }
  if (to) { cond.push(`d.issue_date <= ?${i++}`); binds.push(to); }
  if (allowed && allowed.length) {
    cond.push(`d.issuer_id IN (${allowed.map(() => `?${i++}`).join(",")})`);
    binds.push(...allowed);
  }

  // 売上（税率別）
  const sales = await db
    .prepare(
      `SELECT d.number, d.issue_date, d.subject, c.name AS client, l.tax_rate AS rate, SUM(l.amount) AS net
       FROM documents d JOIN clients c ON c.id=d.client_id JOIN document_lines l ON l.document_id=d.id
       WHERE ${cond.join(" AND ")}
       GROUP BY d.id, l.tax_rate ORDER BY d.issue_date, d.number, l.tax_rate DESC`
    )
    .bind(...binds)
    .all<{ number: string; issue_date: string; subject: string | null; client: string; rate: number; net: number }>();

  // 入金
  const payCond: string[] = ["d.type='invoice'", "d.status != 'canceled'"];
  const payBinds: string[] = [];
  let j = 1;
  if (from) { payCond.push(`p.paid_date >= ?${j++}`); payBinds.push(from); }
  if (to) { payCond.push(`p.paid_date <= ?${j++}`); payBinds.push(to); }
  if (allowed && allowed.length) {
    payCond.push(`d.issuer_id IN (${allowed.map(() => `?${j++}`).join(",")})`);
    payBinds.push(...allowed);
  }
  const pays = await db
    .prepare(
      `SELECT p.paid_date, p.amount, c.name AS client, d.number
       FROM payments p JOIN documents d ON d.id=p.document_id JOIN clients c ON c.id=d.client_id
       WHERE ${payCond.join(" AND ")} ORDER BY p.paid_date`
    )
    .bind(...payBinds)
    .all<{ paid_date: string | null; amount: number; client: string; number: string }>();

  const inclusive = settings.tax_display === "inclusive";
  const lines: string[] = [];
  let no = 1;
  const ymd = (s: string) => s.replace(/-/g, "/");

  for (const s of sales.results ?? []) {
    let tax: number;
    let gross: number;
    if (inclusive) {
      tax = applyRounding((s.net * s.rate) / (100 + s.rate), settings.tax_rounding);
      gross = s.net;
    } else {
      tax = applyRounding((s.net * s.rate) / 100, settings.tax_rounding);
      gross = s.net + tax;
    }
    const taxKbn = `課税売上${s.rate}%`;
    const memo = `売上 ${s.client} ${s.subject ?? s.number}`;
    lines.push(
      row([
        2000, no++, "", ymd(s.issue_date),
        "売掛金", "", "", "対象外", gross, 0,
        "売上高", "", "", taxKbn, gross, tax,
        memo, "", "", 0, "", "", 0, 0, "no",
      ])
    );
  }

  for (const p of pays.results ?? []) {
    lines.push(
      row([
        2000, no++, "", ymd(p.paid_date ?? ""),
        "普通預金", "", "", "対象外", p.amount, 0,
        "売掛金", "", "", "対象外", p.amount, 0,
        `入金 ${p.client} ${p.number}`, "", "", 0, "", "", 0, 0, "no",
      ])
    );
  }

  const body = "﻿" + lines.join("\r\n") + "\r\n";
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="yayoi-journal.csv"`,
    },
  });
};
