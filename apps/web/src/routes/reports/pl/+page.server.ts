import type { PageServerLoad } from "./$types";
import { fiscalYearByEndYear, fiscalYearForDate, fiscalMonths } from "@invoice-harness/shared";
import { canViewPayroll, getDB, getSettings, listIssuers, plSummary } from "$lib/server/db";
import { allowedIssuerIds, canAccessIssuer } from "$lib/server/access";
import { error } from "@sveltejs/kit";

// 損益計算書（PL）。会計年度の12ヶ月×科目マトリクスで、売上・原価・粗利・販管費・営業利益を見る。
// 給与・法定福利費は機微科目のため、閲覧権限（canViewPayroll）が無ければ粗利までしか出さない。
export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const settings = await getSettings(db);
  const today = new Date().toISOString().slice(0, 10);

  // 月の並びを決める基準月。既定は決算月。fm=1 で暦年（1〜12月）へ切替可（targets/monthly と同じ流儀）。
  const fmParam = Number(url.searchParams.get("fm"));
  const fiscalMonth = fmParam >= 1 && fmParam <= 12 ? fmParam : settings.fiscal_month;
  const current = fiscalYearForDate(today, fiscalMonth).endYear;
  const fy = Number(url.searchParams.get("fy")) || current;
  const period = fiscalYearByEndYear(fy, fiscalMonth);
  const months = fiscalMonths(period); // { ym, label }[] × 12（決算翌月始まり）
  const yms = months.map((m) => m.ym);

  // 会社ガード：閲覧可の会社だけタブに出す。iss 指定はその会社に限定（許可外は 404）。
  const allowed = await allowedIssuerIds(db, locals.user);
  let issuers = await listIssuers(db);
  if (allowed) issuers = issuers.filter((i) => allowed.includes(i.id));
  const issParam = url.searchParams.get("iss") ?? "";
  const issuerId = issuers.some((i) => i.id === issParam) ? issParam : "";
  if (issuerId && !canAccessIssuer(allowed, issuerId)) throw error(404, "会社が見つかりません");

  // 給与閲覧権限。false のとき plSummary は機微科目を除外し confidentialHidden=true・営業利益 null を返す。
  const includeConfidential = await canViewPayroll(db, locals.user);

  // 年間サマリ（合計・粗利・営業利益・confidentialHidden・月別 rev/cogs/sgaTotal）
  const summary = await plSummary(db, yms, issuerId || undefined, { includeConfidential });

  // 科目×月のマトリクスを組む。各月の科目別内訳が要るため月ごとにも plSummary を呼び、
  // 権限判定（includeConfidential）を全呼び出しで一致させる。
  const monthlySga = await Promise.all(
    yms.map((ym) => plSummary(db, [ym], issuerId || undefined, { includeConfidential }))
  );
  // category → { label, total, byMonth: number[12] }
  const sgaRowMap = new Map<string, { label: string; total: number; byMonth: number[] }>();
  // 年間の科目順を基準にして行を作る（plSummary が EXPENSE_CATEGORIES 順を保証）
  for (const line of summary.sga) {
    sgaRowMap.set(line.category, { label: line.label, total: line.amount, byMonth: new Array(yms.length).fill(0) });
  }
  monthlySga.forEach((ps, mi) => {
    for (const line of ps.sga) {
      let row = sgaRowMap.get(line.category);
      if (!row) {
        // 年間には無いが月次に出た科目（理論上起きないが保険）
        row = { label: line.label, total: 0, byMonth: new Array(yms.length).fill(0) };
        sgaRowMap.set(line.category, row);
      }
      row.byMonth[mi] = line.amount;
    }
  });
  const sgaRows = [...sgaRowMap.values()];

  return {
    fy,
    current,
    fiscalMonth,
    calendar: fiscalMonth === 12,
    periodLabel: fiscalMonth === 12 ? `${fy}年（暦年）` : period.label,
    months,
    issuers: issuers.map((i) => ({ id: i.id, name: i.name })),
    issuerId,
    multiCompany: issuers.length > 1,
    // 集計本体
    revenue: summary.revenue,
    cogs: summary.cogs,
    grossProfit: summary.grossProfit,
    sgaTotal: summary.sgaTotal,
    operatingProfit: summary.operatingProfit,
    confidentialHidden: summary.confidentialHidden,
    monthRevenue: summary.months.map((m) => m.revenue),
    monthCogs: summary.months.map((m) => m.cogs),
    monthGross: summary.months.map((m) => m.revenue - m.cogs),
    monthSgaTotal: summary.months.map((m) => m.sgaTotal),
    monthOp: summary.months.map((m) => m.op),
    sgaRows,
    // 経費が1件も無い年度か（販管費セクションの空状態表示に使う）
    hasExpenses: sgaRows.length > 0 || summary.confidentialHidden,
    canViewPayroll: includeConfidential,
  };
};
