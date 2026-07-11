import type { PageServerLoad } from "./$types";
import { fiscalYearByEndYear, fiscalYearForDate, fiscalMonths } from "@invoice-harness/shared";
import { effectiveDivision, getDB, getSettings, listClients, listDivisions, listDocuments, listIssuers, listProjects, listTargets, sumTargets } from "$lib/server/db";
import { allowedIssuerIds } from "$lib/server/access";

const REVENUE_TYPES = new Set(["invoice"]);
const EXPENSE_TYPES = new Set(["order", "payment_notice"]);

export const load: PageServerLoad = async ({ platform, url, locals }) => {
  const db = getDB(platform);
  const settings = await getSettings(db);
  const allowed = await allowedIssuerIds(db, locals.user);
  const allDocs = await listDocuments(db, undefined, allowed);
  let issuers = await listIssuers(db);
  if (allowed) issuers = issuers.filter((i) => allowed.includes(i.id));

  // 会社（発行元）フィルタ。空＝（閲覧可能な）全社合算。
  const issParam = url.searchParams.get("iss") ?? "";
  const issuerId = issuers.some((i) => i.id === issParam) ? issParam : "";
  const issuerDocs = issuerId ? allDocs.filter((d) => d.issuer_id === issuerId) : allDocs;

  // 部門（計上区分）フィルタ。複数社では会社を選択したときだけ表示（会社×部門で月次推移を見る）。
  // 1社のみの環境は常にその会社扱いで表示する。
  const allDivisions = await listDivisions(db);
  const chipIssuer = issuerId || (issuers.length === 1 ? issuers[0]?.id ?? "" : "");
  const divChips = chipIssuer ? allDivisions.filter((d) => !d.issuer_id || d.issuer_id === chipIssuer) : [];
  const divParam = url.searchParams.get("div") ?? "";
  const divisionId = divChips.some((d) => d.id === divParam) ? divParam : "";
  // 実効区分（帳票の区分が未設定ならプロジェクトの区分）で絞り込み・集計する
  const docs = divisionId ? issuerDocs.filter((d) => effectiveDivision(d).id === divisionId) : issuerDocs;

  // 決算月の決定:
  //  - 会社を選択 → その会社の決算月（未設定なら全体設定）
  //  - 未選択で会社が1社のみ → その会社の決算月
  //  - 未選択で複数社（合算） → 既定は暦年(1〜12月)。会社ごとに決算月が違うため年度を揃えられないので暦年
  // ?mode=fiscal|calendar で手動切替（トグルボタン）。指定が無ければ上記の自動判定。
  const selected = issuerId ? issuers.find((i) => i.id === issuerId) : null;
  const autoCalendar = !issuerId && issuers.length > 1;
  const modeParam = url.searchParams.get("mode");
  const calendarMode = modeParam === "calendar" ? true : modeParam === "fiscal" ? false : autoCalendar;
  // 決算表示で使う決算月（会社選択時はその会社、合算時は全体設定）。
  const fiscalMonthFor = selected?.fiscal_month ?? (issuers.length === 1 ? issuers[0]?.fiscal_month : null) ?? settings.fiscal_month;
  const effFiscalMonth = calendarMode ? 12 : fiscalMonthFor;

  const today = new Date().toISOString().slice(0, 10);
  const fyParam = Number(url.searchParams.get("fy"));
  const current = fiscalYearForDate(today, effFiscalMonth);
  const endYear = Number.isFinite(fyParam) && fyParam > 0 ? fyParam : current.endYear;
  const fy = fiscalYearByEndYear(endYear, effFiscalMonth);
  const periodLabel = calendarMode
    ? `${fy.endYear}年（年間）${!issuerId && issuers.length > 1 ? "・全社合算" : ""}`
    : fy.label;

  // 取消（無効化）は売上・費用の集計から除外（最近の帳票一覧には表示される）
  const inFy = docs.filter((d) => d.issue_date >= fy.start && d.issue_date <= fy.end && d.status !== "canceled");

  const sumIf = (pred: (d: (typeof docs)[number]) => boolean) =>
    inFy.filter(pred).reduce((a, d) => a + d.total, 0);

  const revenue = sumIf((d) => REVENUE_TYPES.has(d.type));
  const expense = sumIf((d) => EXPENSE_TYPES.has(d.type));
  const paid = sumIf((d) => REVENUE_TYPES.has(d.type) && d.status === "paid");
  const unpaid = revenue - paid;
  const profit = revenue - expense;

  // 売上目標と達成率（設定 ▸ 売上目標 で会社・部門×月ごとに登録）。
  // 月次目標を表示期間（この会計/暦年の12ヶ月）ぶん合計する。決算期表示でも暦年表示でも
  // 実際の暦年月で合計するのでキーがズレない。
  const periodYms = fiscalMonths(fy).map((m) => m.ym);
  const targets = await listTargets(db, periodYms);
  //  - 部門選択中 → その部門の目標 ／ 会社選択中 → その会社の目標 ／ 全社合算 → 会社目標の合計
  let target = 0;
  if (divisionId) target = sumTargets(targets, "division", divisionId);
  else if (issuerId) target = sumTargets(targets, "company", issuerId);
  else target = issuers.reduce((a, i) => a + sumTargets(targets, "company", i.id), 0);
  const achievement = target > 0 ? Math.round((revenue / target) * 1000) / 10 : null;

  // 各月の売上目標（表示中スコープ: 部門/会社/全社合算）。
  const monthTarget = (ym: string) => {
    const inYm = targets.filter((t) => t.ym === ym);
    if (divisionId) return sumTargets(inYm, "division", divisionId);
    if (issuerId) return sumTargets(inYm, "company", issuerId);
    return issuers.reduce((a, i) => a + sumTargets(inYm, "company", i.id), 0);
  };
  const months = fiscalMonths(fy).map((m) => {
    const rev = inFy
      .filter((d) => REVENUE_TYPES.has(d.type) && d.issue_date.startsWith(m.ym))
      .reduce((a, d) => a + d.total, 0);
    const exp = inFy
      .filter((d) => EXPENSE_TYPES.has(d.type) && d.issue_date.startsWith(m.ym))
      .reduce((a, d) => a + d.total, 0);
    return { label: m.label, ym: m.ym, revenue: rev, expense: exp, profit: rev - exp, target: monthTarget(m.ym) };
  });
  const hasMonthTargets = months.some((m) => m.target > 0);
  const maxMonthly = Math.max(1, ...months.map((m) => Math.max(m.revenue, m.expense, m.target)));

  // 部門別（計上区分別）損益 ＋ 部門目標と達成率
  const divMap = new Map<string, { name: string; revenue: number; expense: number }>();
  for (const d of inFy) {
    if (!REVENUE_TYPES.has(d.type) && !EXPENSE_TYPES.has(d.type)) continue;
    const eff = effectiveDivision(d);
    const key = eff.id ?? "__none__";
    if (!divMap.has(key)) divMap.set(key, { name: eff.name ?? "未設定", revenue: 0, expense: 0 });
    const e = divMap.get(key)!;
    if (REVENUE_TYPES.has(d.type)) e.revenue += d.total;
    if (EXPENSE_TYPES.has(d.type)) e.expense += d.total;
  }
  const divisions = [...divMap.entries()]
    .map(([id, v]) => {
      const t = sumTargets(targets, "division", id);
      return {
        ...v,
        profit: v.revenue - v.expense,
        target: t,
        achievement: t > 0 ? Math.round((v.revenue / t) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue || b.expense - a.expense);
  const divMax = Math.max(1, ...divisions.map((v) => Math.max(v.revenue, v.expense)));
  // 区分が1つも作られていない（全部「未設定」のみ）なら表示しない
  const hasDivisions = divisions.some((v) => v.name !== "未設定");
  const hasDivTargets = divisions.some((v) => v.target > 0);

  // ダッシュボードハブ（ナビカードのミニ統計）。閲覧可能スコープ（allDocs）全体で算出。
  const thisMonth = new Date().toISOString().slice(0, 7);
  const clientsList = await listClients(db);
  const projectsList = await listProjects(db);
  const monthAccrual = allDocs
    .filter((d) => REVENUE_TYPES.has(d.type) && d.status !== "canceled" && d.issue_date.startsWith(thisMonth))
    .reduce((a, d) => a + d.total, 0);
  const monthCash = allDocs
    .filter((d) => REVENUE_TYPES.has(d.type) && d.status !== "canceled" && d.paid_at?.startsWith(thisMonth))
    .reduce((a, d) => a + d.total, 0);
  const hub = {
    clients: clientsList.length,
    activeProjects: projectsList.filter((p) => p.status === "active").length,
    monthAccrual,
    monthCash,
    divisions: allDivisions.length,
  };

  return {
    hub,
    fyLabel: periodLabel,
    calendarMode,
    fyEndYear: fy.endYear,
    prevFy: fy.endYear - 1,
    nextFy: fy.endYear + 1,
    isCurrent: fy.endYear === current.endYear,
    issuers: issuers.map((i) => ({ id: i.id, name: i.name })),
    issuerId,
    multiCompany: issuers.length > 1,
    divChips: divChips.map((d) => ({ id: d.id, name: d.name })),
    divisionId,
    kpi: { revenue, expense, profit, paid, unpaid },
    target,
    achievement,
    months,
    maxMonthly,
    hasMonthTargets,
    divisions,
    divMax,
    hasDivisions,
    hasDivTargets,
    recent: docs.slice(0, 8),
  };
};
