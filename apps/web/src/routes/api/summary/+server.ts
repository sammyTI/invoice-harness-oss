import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { fiscalYearByEndYear, fiscalYearForDate } from "@invoice-harness/shared";
import { getDB, getSettings, listDocuments, listIssuers } from "$lib/server/db";

const REVENUE = new Set(["invoice"]);
const EXPENSE = new Set(["order", "payment_notice"]);

// 財務サマリー（PL）。会計年度・会社別・部門別の売上/費用/利益/入金。
// クエリ: ?fy=2027（決算年）, ?issuer=<id or 会社名>
export const GET: RequestHandler = async ({ platform, url }) => {
  const db = getDB(platform);
  const settings = await getSettings(db);
  const issuers = await listIssuers(db);
  const all = (await listDocuments(db)).filter((d) => d.status !== "canceled");

  const today = new Date().toISOString().slice(0, 10);
  const current = fiscalYearForDate(today, settings.fiscal_month);
  const endYear = Number(url.searchParams.get("fy")) || current.endYear;
  const fy = fiscalYearByEndYear(endYear, settings.fiscal_month);

  const issParam = url.searchParams.get("issuer") ?? "";
  const issuer = issParam ? issuers.find((i) => i.id === issParam || i.name === issParam) ?? null : null;

  const inFy = all.filter(
    (d) => d.issue_date >= fy.start && d.issue_date <= fy.end && (!issuer || d.issuer_id === issuer.id)
  );

  const sum = (pred: (d: (typeof inFy)[number]) => boolean) => inFy.filter(pred).reduce((a, d) => a + d.total, 0);
  const revenue = sum((d) => REVENUE.has(d.type));
  const expense = sum((d) => EXPENSE.has(d.type));
  const paid = sum((d) => REVENUE.has(d.type) && d.status === "paid");

  const byCompany = issuers.map((i) => {
    const ds = inFy.filter((d) => d.issuer_id === i.id);
    const rev = ds.filter((d) => REVENUE.has(d.type)).reduce((a, d) => a + d.total, 0);
    const exp = ds.filter((d) => EXPENSE.has(d.type)).reduce((a, d) => a + d.total, 0);
    return { company: i.name, revenue: rev, expense: exp, profit: rev - exp };
  }).filter((c) => c.revenue || c.expense);

  const divMap = new Map<string, { revenue: number; expense: number }>();
  for (const d of inFy) {
    if (!REVENUE.has(d.type) && !EXPENSE.has(d.type)) continue;
    const k = d.division_name ?? "未設定";
    const e = divMap.get(k) ?? { revenue: 0, expense: 0 };
    if (REVENUE.has(d.type)) e.revenue += d.total;
    if (EXPENSE.has(d.type)) e.expense += d.total;
    divMap.set(k, e);
  }
  const byDivision = [...divMap.entries()].map(([name, v]) => ({ division: name, ...v, profit: v.revenue - v.expense }));

  return json({
    fiscal_year: fy.label,
    issuer: issuer?.name ?? "全社合算",
    revenue,
    expense,
    profit: revenue - expense,
    paid,
    unpaid: revenue - paid,
    by_company: byCompany,
    by_division: byDivision,
  });
};
