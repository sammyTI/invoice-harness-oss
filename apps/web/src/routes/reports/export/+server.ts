import type { RequestHandler } from "./$types";
import { DOCUMENT_LABELS, type DocumentType } from "@invoice-harness/shared";
import { getDB } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";

const STATUS_JP: Record<string, string> = {
  draft: "下書き",
  issued: "発行済",
  sent: "送付済",
  paid: "入金済",
  canceled: "取消",
};

function csvCell(v: string | number | null): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET: RequestHandler = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  const where: string[] = [];
  const binds: string[] = [];
  let i = 1;
  if (from) { where.push(`d.issue_date >= ?${i++}`); binds.push(from); }
  if (to) { where.push(`d.issue_date <= ?${i++}`); binds.push(to); }
  const allowed = await allowedIssuerIds(db, locals.user);
  if (allowed && allowed.length) {
    where.push(`d.issuer_id IN (${allowed.map(() => `?${i++}`).join(",")})`);
    binds.push(...allowed);
  }

  const { results } = await db
    .prepare(
      `SELECT d.issue_date, d.type, d.number, d.subject, d.subtotal, d.tax_total, d.total, d.status, d.due_date,
              c.name AS client_name,
              COALESCE((SELECT SUM(amount) FROM payments p WHERE p.document_id=d.id),0) AS paid
       FROM documents d JOIN clients c ON c.id=d.client_id
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
       ORDER BY d.issue_date, d.created_at`
    )
    .bind(...binds)
    .all<{
      issue_date: string; type: DocumentType; number: string; subject: string | null;
      subtotal: number; tax_total: number; total: number; status: string; due_date: string | null;
      client_name: string; paid: number;
    }>();

  const header = ["発行日", "種別", "番号", "取引先", "件名", "小計(税抜)", "消費税", "合計(税込)", "入金済", "残額", "ステータス", "期日"];
  const rows = (results ?? []).map((r) => [
    r.issue_date, DOCUMENT_LABELS[r.type], r.number, r.client_name, r.subject ?? "",
    r.subtotal, r.tax_total, r.total, r.paid, r.total - r.paid, STATUS_JP[r.status] ?? r.status, r.due_date ?? "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const body = "﻿" + csv; // BOM for Excel

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="invoice-harness-export.csv"`,
    },
  });
};
