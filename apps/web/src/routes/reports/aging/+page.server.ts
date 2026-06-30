import type { PageServerLoad } from "./$types";
import { getDB } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00Z").getTime();
  const db = new Date(b + "T00:00:00Z").getTime();
  return Math.floor((da - db) / 86400000);
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  const db = getDB(platform);
  const today = new Date().toISOString().slice(0, 10);

  const allowed = await allowedIssuerIds(db, locals.user);
  let issuerCond = "";
  const extra: string[] = [];
  if (allowed && allowed.length) {
    issuerCond = ` AND d.issuer_id IN (${allowed.map((_, idx) => `?${1 + idx}`).join(",")})`;
    extra.push(...allowed);
  }

  const { results } = await db
    .prepare(
      `SELECT d.id, d.number, d.issue_date, d.due_date, d.total,
              c.name AS client_name,
              COALESCE((SELECT SUM(amount) FROM payments p WHERE p.document_id=d.id),0) AS paid
       FROM documents d JOIN clients c ON c.id=d.client_id
       WHERE d.type='invoice' AND d.status != 'paid' AND d.status != 'canceled'${issuerCond}
       ORDER BY d.due_date, d.issue_date`
    )
    .bind(...extra)
    .all<{
      id: string; number: string; issue_date: string; due_date: string | null;
      total: number; client_name: string; paid: number;
    }>();

  const buckets = { notDue: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90: 0 };
  const rows = (results ?? [])
    .map((r) => {
      const balance = r.total - r.paid;
      const basis = r.due_date ?? r.issue_date;
      const overdue = daysBetween(today, basis); // >0 = 期日超過日数
      let bucket: keyof typeof buckets;
      if (overdue <= 0) bucket = "notDue";
      else if (overdue <= 30) bucket = "d0_30";
      else if (overdue <= 60) bucket = "d31_60";
      else if (overdue <= 90) bucket = "d61_90";
      else bucket = "d90";
      buckets[bucket] += balance;
      return { ...r, balance, overdue, bucket };
    })
    .filter((r) => r.balance > 0);

  return { rows, buckets, total: rows.reduce((a, r) => a + r.balance, 0) };
};
