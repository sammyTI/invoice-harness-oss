import type { PageServerLoad } from "./$types";
import { cashFlowForMonth, getDB, listDocuments, listIssuers, listTargets, sumTargets } from "$lib/server/db";
import type { DocumentType } from "@invoice-harness/shared";
import { allowedIssuerIds } from "$lib/server/access";

const REVENUE = new Set(["invoice"]);
const EXPENSE = new Set(["order", "payment_notice"]);

// 一覧テーブル（+page.svelte）が読む行の共通形。計上ベース(DocumentListRow)と
// 入出金ベース(CashFlowRow から派生)の両方がこの形を満たす。
interface MonthlyRow {
  id: string;
  type: DocumentType;
  number: string;
  status: string;
  issue_date: string;
  due_date: string | null;
  subject: string | null;
  client_name: string;
  division_name: string | null;
  project_name: string | null;
  project_division_name: string | null;
  paid_at: string | null;
  total: number;
}

// 月次の入出金確認。
//  - accrual（計上ベース）: 発行日が当月の請求（入金）と支払（出金）を total で見る。
//  - cash（入出金ベース）: payments（paid_date × amount）基準。部分入金もその発生月に正しく計上する。
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

  const basis = url.searchParams.get("basis") === "cash" ? "cash" : "accrual";

  // 表示用の一覧行（請求/入金 と 支払）と KPI をベースごとに組み立てる。
  let invoices: MonthlyRow[];
  let payments: MonthlyRow[];
  let kpi: {
    revTotal: number;
    revPaid: number;
    revUnpaid: number;
    expTotal: number;
    expPaid: number;
    expUnpaid: number;
    profit: number;
  };

  if (basis === "cash") {
    // 入出金ベース: payments テーブル基準。issuer 選択時はSQLで絞り、
    // 未選択かつ閲覧制限ありのときは取得後に allowed で絞る。
    const cf = await cashFlowForMonth(db, month, issuerId || undefined);
    const scope = (r: { issuer_id: string }) => (allowed ? allowed.includes(r.issuer_id) : true);
    const cfInvoices = issuerId ? cf.invoices : cf.invoices.filter(scope);
    const cfPayments = issuerId ? cf.payments : cf.payments.filter(scope);
    // 一覧の金額列は「その月の入金額（SUM(payments.amount)）」を total フィールドに載せて表示側と共通化する。
    const toRow = (r: (typeof cf.invoices)[number]): MonthlyRow => ({
      id: r.id,
      type: r.type,
      number: r.number,
      status: r.status,
      issue_date: r.issue_date,
      due_date: r.due_date,
      subject: r.subject,
      client_name: r.client_name,
      division_name: r.division_name,
      project_name: r.project_name,
      project_division_name: r.project_division_name,
      paid_at: r.paid_on, // その月の入金/支払の最終日を入金日列に表示
      total: r.month_amount, // その月の入金/支払額の合算
    });
    invoices = cfInvoices.map(toRow);
    payments = cfPayments.map(toRow);
    const incoming = cfInvoices.reduce((a, r) => a + (r.month_amount ?? 0), 0);
    const outgoing = cfPayments.reduce((a, r) => a + (r.month_amount ?? 0), 0);
    // cash では「入金待ち」は無意味なので済/待ちサブは持たせない（0固定）。
    kpi = {
      revTotal: incoming,
      revPaid: 0,
      revUnpaid: 0,
      expTotal: outgoing,
      expPaid: 0,
      expUnpaid: 0,
      profit: incoming - outgoing,
    };
  } else {
    // 計上ベース: 発行日が当月の帳票を total で集計。
    const inMonth = docs.filter((d) => d.status !== "canceled" && d.issue_date.startsWith(month));
    const inv = inMonth.filter((d) => REVENUE.has(d.type));
    const pay = inMonth.filter((d) => EXPENSE.has(d.type));
    const sum = (rows: typeof inMonth) => rows.reduce((a, d) => a + d.total, 0);
    const revTotal = sum(inv);
    const revPaid = sum(inv.filter((d) => d.status === "paid"));
    const expTotal = sum(pay);
    const expPaid = sum(pay.filter((d) => d.status === "paid"));
    invoices = inv;
    payments = pay;
    kpi = {
      revTotal,
      revPaid,
      revUnpaid: revTotal - revPaid,
      expTotal,
      expPaid,
      expUnpaid: expTotal - expPaid,
      profit: revTotal - expTotal,
    };
  }

  // その月の売上目標（会社選択中はその会社、全社合算は全社の合計）と達成率
  const monthTargets = await listTargets(db, [month]);
  const target = issuerId
    ? sumTargets(monthTargets, "company", issuerId)
    : issuers.reduce((a, i) => a + sumTargets(monthTargets, "company", i.id), 0);
  const achievement = target > 0 ? Math.round((kpi.revTotal / target) * 1000) / 10 : null;

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
    kpi,
  };
};
