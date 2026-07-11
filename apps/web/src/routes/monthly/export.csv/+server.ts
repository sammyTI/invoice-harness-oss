import type { RequestHandler } from "./$types";
import { lifecycle } from "@invoice-harness/shared";
import { effectiveDivision, getDB, listDocuments, listIssuers } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";
import { csvResponse } from "$lib/server/csv";

const REVENUE = new Set(["invoice"]);
const EXPENSE = new Set(["order", "payment_notice"]);

// 一覧（monthly/+page.server.ts）と同じフィルタ条件を適用してCSVを返す。
export const GET: RequestHandler = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  const all = await listDocuments(db, undefined, allowed);
  let issuers = await listIssuers(db);
  if (allowed) issuers = issuers.filter((i) => allowed.includes(i.id));

  // 一覧と同じ: iss=会社／ m=月（YYYY-MM）／ basis=accrual(計上) or cash(入出金)
  const issParam = url.searchParams.get("iss") ?? "";
  const issuerId = issuers.some((i) => i.id === issParam) ? issParam : "";
  const docs = issuerId ? all.filter((d) => d.issuer_id === issuerId) : all;

  const today = new Date().toISOString().slice(0, 10);
  const mParam = url.searchParams.get("m") ?? "";
  const month = /^\d{4}-\d{2}$/.test(mParam) ? mParam : today.slice(0, 7);

  const basis = url.searchParams.get("basis") === "cash" ? "cash" : "accrual";
  const inMonth = docs.filter((d) => {
    if (d.status === "canceled") return false;
    return basis === "cash" ? !!d.paid_at?.startsWith(month) : d.issue_date.startsWith(month);
  });
  const invoices = inMonth.filter((d) => REVENUE.has(d.type));
  const payments = inMonth.filter((d) => EXPENSE.has(d.type));

  const toRow = (d: (typeof inMonth)[number], kind: "請求" | "支払") => [
    kind,
    d.client_name,
    d.subject,
    d.total,
    d.issue_date,
    d.due_date,
    d.paid_at,
    lifecycle(d).label,
    effectiveDivision(d).name,
    d.project_name,
  ];

  const header = ["区分", "取引先", "件名", "金額(税込)", "発行日", "期日", "入金・支払日", "状態", "部門", "プロジェクト"];
  const body = [
    ...invoices.map((d) => toRow(d, "請求")),
    ...payments.map((d) => toRow(d, "支払")),
  ];

  const filename = `月次_${month}.csv`;
  return csvResponse(filename, header, body);
};
