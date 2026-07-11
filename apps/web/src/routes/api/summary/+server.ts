import type { RequestHandler } from "./$types";
import { json } from "@sveltejs/kit";
import { fiscalYearByEndYear, fiscalYearForDate } from "@invoice-harness/shared";
import { canViewFinance, effectiveDivision, getDB, getSettings, listDocuments, listIssuers } from "$lib/server/db";
import { todayJst } from "$lib/server/today";

const REVENUE = new Set(["invoice"]);
const EXPENSE = new Set(["order", "payment_notice"]);

// 財務サマリー（PL）。会計年度・会社別・部門別の売上/費用/入金。
// クエリ: ?fy=2027（決算年）, ?issuer=<id or 会社名>
// 経営数値ガード: /api/ は Bearer トークン認証（hooks）でメンバー識別が無いため、
// セッションユーザ（locals.user）が存在しかつ経営数値の閲覧権限が無い場合のみ 403 で拒否する。
// トークン経由（locals.user 無し）は owner 発行の全社トークン前提で従来どおり通す。
export const GET: RequestHandler = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  if (locals.user && !(await canViewFinance(db, locals.user))) {
    return json({ error: "forbidden: finance access required" }, { status: 403 });
  }
  const settings = await getSettings(db);
  const issuers = await listIssuers(db);
  const all = (await listDocuments(db)).filter((d) => d.status !== "canceled");

  const issParam = url.searchParams.get("issuer") ?? "";
  const issuer = issParam ? issuers.find((i) => i.id === issParam || i.name === issParam) ?? null : null;

  // 決算月: 会社選択時はその会社（未設定は全体設定）、複数社の合算時は暦年(12月)で集計。
  const calendarMode = !issuer && issuers.length > 1;
  const effFiscalMonth = calendarMode
    ? 12
    : (issuer?.fiscal_month ?? (issuers.length === 1 ? issuers[0]?.fiscal_month : null) ?? settings.fiscal_month);

  const today = todayJst();
  const current = fiscalYearForDate(today, effFiscalMonth);
  const endYear = Number(url.searchParams.get("fy")) || current.endYear;
  const fy = fiscalYearByEndYear(endYear, effFiscalMonth);

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

  // 実効区分（帳票の区分が未設定ならプロジェクトの区分）の id をキーに集計する。
  // 名前キーだと同名部門が会社を跨いだとき合算されてしまうため、id で分離し名前は表示用に持つ。
  const divMap = new Map<string, { name: string; revenue: number; expense: number }>();
  for (const d of inFy) {
    if (!REVENUE.has(d.type) && !EXPENSE.has(d.type)) continue;
    const eff = effectiveDivision(d);
    const k = eff.id ?? "__none__";
    const e = divMap.get(k) ?? { name: eff.name ?? "未設定", revenue: 0, expense: 0 };
    if (REVENUE.has(d.type)) e.revenue += d.total;
    if (EXPENSE.has(d.type)) e.expense += d.total;
    divMap.set(k, e);
  }
  const byDivision = [...divMap.values()].map((v) => ({ division: v.name, revenue: v.revenue, expense: v.expense, profit: v.revenue - v.expense }));

  return json({
    fiscal_year: calendarMode ? `${fy.endYear}年（暦年・全社合算）` : fy.label,
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
