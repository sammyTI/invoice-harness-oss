import type { PageServerLoad } from "./$types";
import { getDB, listDocuments, listIssuers, listTargets, sumTargets } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";

const REVENUE = new Set(["invoice"]);
const EXPENSE = new Set(["order", "payment_notice"]);

// 月次の入出金確認。発行日（計上月）ベースで、その月の請求（入金）と支払（出金）を左右で見る。
export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const allowed = await allowedIssuerIds(db, locals.user);
  const all = await listDocuments(db, undefined, allowed);
  let issuers = await listIssuers(db);
  if (allowed) issuers = issuers.filter((i) => allowed.includes(i.id));

  const issParam = url.searchParams.get("iss") ?? "";
  const issuerId = issuers.some((i) => i.id === issParam) ? issParam : "";
  const docs = issuerId ? all.filter((d) => d.issuer_id === issuerId) : all;

  const today = new Date().toISOString().slice(0, 10);
  const mParam = url.searchParams.get("m") ?? "";
  const month = /^\d{4}-\d{2}$/.test(mParam) ? mParam : today.slice(0, 7);
  const [y, mo] = month.split("-").map(Number);
  const prev = `${mo === 1 ? y - 1 : y}-${String(mo === 1 ? 12 : mo - 1).padStart(2, "0")}`;
  const next = `${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, "0")}`;

  // 集計ベース: accrual=計上（発行日が当月）／ cash=入出金（入金・支払日 paid_at が当月）
  const basis = url.searchParams.get("basis") === "cash" ? "cash" : "accrual";
  const inMonth = docs.filter((d) => {
    if (d.status === "canceled") return false;
    return basis === "cash" ? !!d.paid_at?.startsWith(month) : d.issue_date.startsWith(month);
  });
  const invoices = inMonth.filter((d) => REVENUE.has(d.type));
  const payments = inMonth.filter((d) => EXPENSE.has(d.type));

  const sum = (rows: typeof inMonth) => rows.reduce((a, d) => a + d.total, 0);
  const revTotal = sum(invoices);
  const revPaid = sum(invoices.filter((d) => d.status === "paid"));
  const expTotal = sum(payments);
  const expPaid = sum(payments.filter((d) => d.status === "paid"));

  // その月の売上目標（会社選択中はその会社、全社合算は全社の合計）と達成率
  const monthTargets = await listTargets(db, [month]);
  const target = issuerId
    ? sumTargets(monthTargets, "company", issuerId)
    : issuers.reduce((a, i) => a + sumTargets(monthTargets, "company", i.id), 0);
  const achievement = target > 0 ? Math.round((revTotal / target) * 1000) / 10 : null;

  return {
    basis,
    month,
    prev,
    next,
    isCurrent: month === today.slice(0, 7),
    issuers: issuers.map((i) => ({ id: i.id, name: i.name })),
    issuerId,
    multiCompany: issuers.length > 1,
    invoices,
    payments,
    target,
    achievement,
    kpi: {
      revTotal,
      revPaid,
      revUnpaid: revTotal - revPaid,
      expTotal,
      expPaid,
      expUnpaid: expTotal - expPaid,
      profit: revTotal - expTotal,
    },
  };
};
